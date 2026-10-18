# Feature: Release cut (Phase 7 of qa-runner-grounding-vocabulary-v2)

```
**Decision Gate**
- Active context: none
- Activated criteria: before any planning (`docs/decision-gate.md`); release cut (plugin manifest version lock-step with the changelog, the binding `documentation/AGENTS.md` contract for every `documentation/` edit); impact on shared contracts (the validation suite checks `version-parity`, `registration-parity`, `path-existence`, `line-endings`, `decisions-mirror`, `anti-patterns-mirror`, `auth-secrecy` and `qa-run-contract`); documentation of secret and personal-data handling in run evidence (what a page may claim about snapshots, typed values and request paths); a phase whose last clause (the install) cannot be performed by the autonomous loop
- Decisions found:
  - [2026-04-30] "Plugin manifest version is bumped on every minor/major release cut in documentation/changelog.html": a minor changelog release bumps `plugins/relay/.claude-plugin/plugin.json` to the same value in the same commit (`documentation/AGENTS.md` section 7.5)
  - [2026-05-18] Pillar 2/3 boundary: `/relay-execute` never commits, pushes or opens a PR, so the install (which needs the work committed and merged) is operator-owned
  - [2026-09-25] "Executing a QA report's cases, backed by a project-local test-auth kit under `PRPs/auth/`, is a registered future capability": the local-only guard is permanent, the outcome vocabulary is a closed set, secrets never reach reports, the human gate stays open; the pages describe that behavior and never relax it
  - [2026-08-05] "Plugin-owned resources live in `plugins/relay/resources/`, not `docs/context/`": `redaction-policy.md` stays plugin-owned and the site page only mirrors it
  - [2026-04-19] "Secret redaction policy for Test Runner reports": layered policy, per-project extensions
  - [2026-09-25] "The hybrid `/code-review` pass affects a verdict only under four named conditions": the review loop stays frozen
  - `PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md` Decisions Log "Frozen surfaces" (the review-loop files, `capture.mjs` and `/relay-qa-report` byte-identical, AC-14), "Validation checks" (extend `qa-run-contract` and `auth-secrecy`, the count stays 28), "Deferred findings" and "Phase 6 optional"
  - [2026-07-09] every `## Validation Commands` entry and per-task `VALIDATE` must carry real exit-code semantics; [2026-07-10] R-X strict: the Implementer authors zero test files and test edits go through the test pair's lifecycle ledger
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`
- Applicable anti-patterns:
  - "Emitting secret values in run reports or logs": a page that says a typed value, a request path or a snapshot entry is safe when it is not is a leak instruction; the pages state the caveats the runner has
  - "Writing pipeline artifacts under `.claude/`"
  - "Treating `plugins/prp-core/` as active relay code"
  - "Relying on interactive permission prompts in the autonomous loop": the install is never performed by the loop, so no task here runs it
  - "Weakening or deleting tests to make the auto-correction loop turn green": no existing assertion is made stale by this design (see `## Notes`); one the test pair finds that this analysis missed is routed as `EXISTING_TEST_UPDATED`, never edited by the Implementer
- Applicable architectural rules:
  - `documentation/AGENTS.md` is binding: no build step, no new CSS or JS file, no inline `style`, no emoji, relative paths only, the canonical page template, the CSS vocabulary, the three-file registration rule (NAV in `assets/js/app.js`, `assets/data/search-index.json`, `changelog.html`), the section 7.5 lock-step, and every `documentation/` change carries a changelog entry
  - Interactivity boundary: no new extension; this phase writes documentation and one manifest field
  - PRP artifact paths: this plan and every artifact path resolve under `PRPs/`
  - Diff-base contract: any changed-file derivation uses the single-argument `git diff <base>` form, here the commit `e7a40810f50004d46c5caaa6edaf6c0aec691dc3` for the whole feature and the tree object `896498d969724e4c3e65588eaea7c6af93b49771` for this phase
  - `docs/decisions.md` and `docs/anti-patterns.md` are mechanically mirrored into `documentation/governance/*.html` (`decisions-mirror`, `anti-patterns-mirror`), so this phase registers no entry in either
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md` — Implementation Phases row 7: "Release cut" — Goal: a released, installed version that the dogfood can use — Success signal: `npm run validate` passes 28 checks, the corpus is green, and the installed version is the new minor.

The install clause is operator-owned. PRD line 233 (row 7 Description: "install of the new version"), line 272 (Scope: "the local install") and line 273 (Success signal: "the installed version is the new minor") name it, and no PRD acceptance criterion does: AC-14 (line 114) and AC-17 (line 117) are the two ACs the row cites. `/relay-execute` never commits, pushes or installs (`docs/decisions.md` 2026-05-18) and an install needs the work committed and merged, so this plan delivers a release-ready tree and states the install as ordered operator steps in `## Notes`. No acceptance criterion below claims the install happened.

## Summary

Cut the 0.46.0 release of the plugin that ships phases 1 to 6 of `qa-runner-grounding-vocabulary-v2`, and bring every documentation surface that names the QA runner up to what the runner now does. The work is documentation and one manifest field: `plugins/relay/.claude-plugin/plugin.json` goes from `0.45.0` to `0.46.0`; `documentation/changelog.html` turns its `Unreleased` block into a dated `0.46.0` release with a fresh empty `Unreleased` above it and the section 7.5 manifest-bump line; `README.md` names the new version. Four reference pages (`commands`, `scripts`, `redaction-policy`, `validation-checks`), the validation-suite guide, the roadmap status page and `docs/api-reference.md` describe the classification and reason-code catalogue, the stable grounding wait and the text candidates, the grounding prefix, the source-first redaction floor, the proven run-evidence ignore, the session-less request, the input-value, absence and state assertions, the request count, the bounded re-mint and the `--refresh` role set, with every chosen number marked chosen and every leak caveat stated as the runner has it. The search index excerpts of the changed pages follow. No plugin-owned text, no test, no check, no governance entry and none of the frozen surfaces is touched. The implementer delivers a tree on which `npm run validate` passes 28 of 28 and the corpus is green; committing, the PR, the merge and the install are the operator's steps after this phase.

## User Story

As the operator of relay's human validation gate
I want the release that carries the QA runner fixes cut, versioned and documented as the runner now behaves
So that the dogfood of phase 8 runs on a named installed version and the pages I read never promise safety the runner does not have

## Problem Statement

Phases 1 to 6 changed `qa-run.mjs`, the `/relay-qa-run` and `/relay-auth-scripts` command documents and the redaction policy, but the manifest still says `0.45.0` and every page of the documentation site still describes the 0.45.0 runner: the `/relay-qa-run` entry says the runner registers every IndexedDB key and value as a secret (now source-first above a floor), the `ground` mode has no stable wait, no `--prefix`, no `GROUND_UNSTABLE` and no run-directory `.gitignore`, the step vocabulary lacks five steps, the redaction policy page has no section on the QA evidence, `qa-run-contract` is documented as having no unit tests and as pinning only the outcome vocabulary, and `docs/api-reference.md` lists none of the 54 new exports. Nothing machine-checked notices: only `version-parity` reads the manifest and the changelog, and no test reads most of these pages. The documentation phases of the earlier phases deliberately deferred all of it here (`docs-update.md` DQ1 and DQ2).

## Solution Statement

One serial pass over the pages the earlier phases named, each edit narrow and anchored so a pinned sentence cannot move, followed by the release cut itself as the last edit so the changelog entry can list what was done. Page statements are mirrored from the three verified sources (the command document, the plugin-owned redaction policy and the `docs/domain/glossary.md` QA entries), and every number is derived from the runner's own exports at validation time, never hard-coded twice. The cut follows the shape of the 0.45.0 commit (`4667d43`): a fresh `<h2 id="unreleased">` with a single "Nothing yet" paragraph above the new release, the old `unreleased-*` subsection ids renamed to the release id, and the plugin bump line under `Changed`. A scope fence compares the working tree with the phase-6 tree so no file outside this plan changes and no test, check, plugin text, decision or anti-pattern entry is touched.

## Metadata

| Key | Value |
|-----|-------|
| Type | documentation, release cut |
| Complexity | MEDIUM (11 files, 4 of them with very long single-line `<dd>` or table rows that pinned tests also read) |
| Systems Affected | `plugins/relay/.claude-plugin/plugin.json`; `documentation/changelog.html`; `documentation/reference/commands.html`, `scripts.html`, `redaction-policy.html`, `validation-checks.html`; `documentation/guide/validation-suite.html`; `documentation/roadmap/status.html`; `documentation/assets/data/search-index.json`; `docs/api-reference.md`; `README.md` |
| Dependencies | `Depends` is `3, 5, 6` (all `complete`); shares no lane; Phase 8 (the dogfood) follows and needs the install the operator performs |
| Estimated Tasks | 10 |
| Source PRD line ref | `PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md` lines 114 and 117 (AC-14, AC-17), 206-207 (Architecture Notes: validation suite and repo workflow), 233 (row 7), 270-273 (Phase 7 details), 289-302 (Decisions Log) |
| phase_type | docs |

`phase_type: docs`: the `## Files to Change` table holds only documentation files (`.md`, `.html`), one JSON manifest and one JSON search-data file, and no application source. Validation is content-and-exit-code oriented; the corpus runs at Level 3 only as a regression gate.

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `documentation/AGENTS.md` | 31-41, 75-126, 239-286, 288-380, 400-408, 463-471 | BINDING contract for every `documentation/` edit: the invariants (no emoji, no inline style, relative paths, no new CSS or JS), the page template, the three-file registration rule, the changelog and section 7.5 lock-step rules, the modify-an-existing-page workflow, the halt conditions |
| P0 | `PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md` | 114, 117, 206-207, 233, 270-273, 289-302 | AC-14 (frozen surfaces) and AC-17 (28 checks, corpus green), the validation-suite and release-workflow notes, row 7, the Phase 7 details (including the install clause that is operator-owned) and the Decisions Log rows that bind this phase |
| P0 | `plugins/relay/commands/relay-qa-run.md` | 179-210, 315-345, 375-427, 498-586, 745-766 | The behavior the pages mirror: ground and the stable wait, `expect_requests`, the grounding prefix, the classification and the catalogue, the minted re-mint |
| P0 | `plugins/relay/resources/redaction-policy.md` | 177-266 | The section `reference/redaction-policy.html` mirrors, with its two subsections and six bullets |
| P0 | `docs/domain/glossary.md` | 306-355, 378-431, 433-491, 493-533, 535-555 | The verified statements about the assertion actions, the grounding snapshot, the observed-request window, the run-evidence ignore, the session-less request and the session-value floor, each checked against the code by the earlier docs-sync passes |
| P0 | `documentation/changelog.html` | 31-47, 49-55, 121-130, 171-176 | The `Unreleased` block that is cut, the 0.45.0 head, the shape of a release block, and the manifest-bump line a release carries |
| P0 | `scripts/validate/checks/version-parity.mjs` | 46-62, 119-129 | The heading regex (`<h2 id>` whose text carries no nested tag and starts with `X.Y.Z`) and the comparison that makes the cut red when the manifest and the first release heading disagree |
| P0 | `documentation/reference/commands.html` | 326-337, 339-350 | The `/relay-auth-scripts` and `/relay-qa-run` entries edited by Task 1 |
| P0 | `documentation/reference/scripts.html` | 207-231 | The `qa-run.mjs` entry edited by Task 2 |
| P0 | `documentation/reference/redaction-policy.html` | 24, 143-157 | The subtitle, the closing section the new one precedes, and the Related list |
| P0 | `documentation/reference/validation-checks.html` | 63, 65, 339-351, 366-375 | The two summary rows and the `auth-secrecy` and `qa-run-contract` sections edited by Task 4 |
| P0 | `documentation/roadmap/status.html` | 228-243, 277-284, 577-592 | The feature PRD table end, the governance counts and the manual-QA runner section edited by Task 6 |
| P0 | `docs/api-reference.md` | 128, 129, 219 | The `/relay-auth-scripts`, `/relay-qa-run` and `qa-run.mjs` rows edited by Task 7 |
| P1 | `documentation/guide/validation-suite.html` | 96, 98 | The two table rows edited by Task 5 |
| P1 | `documentation/assets/data/search-index.json` | 110-115, 134-139, 158-163 | The three excerpts edited by Task 8 |
| P1 | `README.md` | 16-19 | The live version prose that no check reads |
| P1 | `plugins/relay/commands/relay-auth-scripts.md` | 239-244 | The `--refresh` role-set paragraph `commands.html` and `api-reference.md` mirror |
| P1 | `plugins/relay/scripts/qa-run.mjs` | 84-148, 669-671, 885-891, 1105-1108, 1570-1573, 1657-1672, 1863-1905 | The exported constants whose numbers the pages state and the validation derives |
| P1 | `scripts/validate/checks/qa-run-contract.mjs` | 1-80, 378, 397 | The rule sets and the verbatim finding messages `validation-checks.html` quotes |
| P1 | `scripts/validate/checks/auth-secrecy.mjs` | 1-17, 96-145 | The run-evidence rule set and its verbatim finding messages |
| P1 | `scripts/validate/checks/qa-run-minted-session.test.mjs` | 500-523 | Read-only: the pinned halt names, `240` and `IndexedDB` the edits must keep in `commands.html`, `scripts.html`, `api-reference.md` and `changelog.html` |
| P1 | `PRPs/reports/qa-runner-grounding-vocabulary-v2/docs-update.md` | 48-49, 55, 70-76 | Read-only (git-ignored run artifact): DQ1 and DQ2 (what each page lacks), DQ12 (the policy mirror) and DQ27 to DQ33 (the caveats the pages must not overstate) |

## Patterns to Mirror

```
# SOURCE: documentation/changelog.html:31-36
      <h2 id="unreleased">Unreleased</h2>

      <h3 id="unreleased-changed">Changed</h3>

      <ul>
        <li><strong><code>roadmap/status.html</code></strong> &mdash; synced with the PRDs after the 2026-10-09
```
Copied by Task 9 (this block is what the cut turns into the release: the heading and the `<h3 id="unreleased-changed">` line are the two anchors; the three existing `<li>` entries stay byte-identical inside the new release, so a test that finds an entry by its text is undisturbed).

```
# SOURCE: documentation/changelog.html:121-130
      <h2 id="v0-44-0">0.44.0 &#8212; 2026-10-06</h2>

      <p>The case vocabulary. With a session per role in place, the 0.42.0 re-runs still drove almost nothing: 1 of
        14 reachable cases across <code>super-ensino</code> and <code>praesto-sum</code>. The cause was the vocabulary,
        not authentication. This release ships phases 1&ndash;7 of
        <code>PRPs/prds/qa-runner-case-vocabulary.prd.md</code>. Phase 8, the dogfood on the same byte-identical reports,
        follows on this release. The four-outcome vocabulary, the local-only guard and the secrecy rules are unchanged,
        and <code>/relay-qa-report</code> and the reports are untouched.</p>

      <h3 id="v0-44-0-added">Added</h3>
```
Copied by Task 9 (the new release block has this exact shape: an `<h2 id="vX-Y-Z">` whose text is plain `X.Y.Z &#8212; YYYY-MM-DD` with no nested tag, an intro paragraph, then `Added` and `Changed` subsections whose ids carry the release id).

```
# SOURCE: documentation/changelog.html:171-175
        <li><strong><code>plugins/relay/.claude-plugin/plugin.json</code></strong>
          &mdash; version bumped <code>0.43.0</code> &rarr; <code>0.44.0</code> to
          match this release; users running <code>/plugin</code> after pulling
          this version will get a fresh <code>relay/0.44.0/</code> cache directory
          with <code>/relay-qa-seed</code> and the new runner vocabulary registered.</li>
```
Copied by Task 9 (the section 7.5 manifest-bump line; the 0.45.0 block omitted it, which `documentation/AGENTS.md` 361-365 forbids, so this release carries it).

```
# SOURCE: documentation/reference/commands.html:344-345
        <dt>Output</dt>
        <dd><code>PRPs/reports/&lt;feature&gt;/qa-run/&lt;run-id&gt;/results.json</code> with exactly one entry per report case, each <code>pass</code>, <code>fail</code>, <code>blocked</code> or <code>needs-human</code>, plus redacted evidence and the <code>plan.json</code> the command wrote.</dd>
```
Copied by Task 1 (the new `.kv` rows of the `/relay-qa-run` entry are `<dt>` and `<dd>` pairs on two physical lines at eight spaces of indent, exactly this shape; the `.kv` vocabulary is the one `documentation/AGENTS.md` 5.2 allows).

```
# SOURCE: documentation/reference/scripts.html:216
        <dt>API origins</dt><dd><code>api_origins</code> in <code>login.config.json</code> lets an HTTP step name a second local origin. Every declared origin passes the local-only guard, the step path must be relative, and a header derived from the session of the role is registered for redaction and never printed.</dd>
```
Copied by Task 2 (the `qa-run.mjs` entry uses one-line `<dt>X</dt><dd>...</dd>` rows; the new rows follow that form, not the two-line form of `commands.html`).

```
# SOURCE: documentation/reference/redaction-policy.html:143-146
      <h2 id="what-this-is-not">What this policy is NOT</h2>

      <ul>
        <li><strong>Not a replacement for proper secret management.</strong> Secrets must still be injected via <code>.env</code> / vault / compose secrets, NOT hardcoded in source. This policy catches accidental leaks into test output; it doesn't legitimize sloppy handling upstream.</li>
```
Copied by Task 3 (the new `<h2 id="qa-runner-evidence">` section is inserted immediately above this heading and uses the same `<h2>`, `<h3>`, `<ul>`, `<li><strong>Label.</strong>` and `callout` forms the page already has).

```
# SOURCE: documentation/assets/data/search-index.json:110-113
  {
    "title": "Commands",
    "path": "reference/commands.html",
    "category": "Reference",
```
Copied by Task 8 (each entry is an object of `title`, `path`, `category` and `excerpt`, the excerpt one physical line; the edit extends the `excerpt` strings of three existing entries and adds no object, because no page is added).

```
# SOURCE: documentation/roadmap/status.html:235-241
          <tr>
            <td><code>test-auth-minted-session</code></td>
            <td>4</td>
            <td><span class="badge badge--done">complete</span></td>
            <td>0.45.0</td>
            <td>Minted sessions: a confirmed local command issues each role's session, no login</td>
          </tr>
```
Copied by Task 6 (the new feature PRD row has these five cells; the badge variant for a partly shipped feature is `badge--partial`, one of the four variants `documentation/AGENTS.md` 5.3 allows).

```
# SOURCE: documentation/reference/validation-checks.html:375
      <p><strong>Unit tests:</strong> none yet; the test pair authors them after the implementation lands.</p>
```
Copied by Task 4 (this sentence is wrong today: `scripts/validate/checks/qa-run-contract.test.mjs` exists; the paragraph is replaced by the `<strong>Unit tests (N).</strong>` form every other entry of the page uses, with N read from the real test run).

```
# SOURCE: docs/domain/glossary.md:535-547
## QA session-value floor

The rule that decides which strings of a saved session `qa-run.mjs` registers
as secrets for redaction by substring. Registration is by source: the token
artifact, the cookie the role declares as `sessionCookie` and the cookie named
by each `api_origins` entry are always registered (only the redaction table's
4-character minimum applies). Every other cookie, `localStorage` and IndexedDB
string, record keys included, is registered only when it is at least 12
characters long (`SESSION_VALUE_MIN_LENGTH`) and has a Shannon entropy of at
least 3.0 bits per character (`SESSION_VALUE_MIN_ENTROPY`), and never when it is
a part of the target origin; short literals such as `true`, `false` or a small
integer are therefore never registered, and `localhost` or `MIDDLE` no longer
turn a verbatim URL into `[REDACTED]`. The numbers are a judgment calibrated on
```
Copied by Tasks 1, 2, 3 and 7 (the model of how each page states the floor: by source first, the two numbers named after the constants, never a part of the target origin, a judgment and not a measurement).

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
    if (versionMatch) {
      return { version: versionMatch[0] };
    }
```
Copied by Task 9 (the release heading must carry no nested tag, must start with `X.Y.Z`, and must be the first non-`unreleased` `<h2>`; the validation reuses this regex).

```
# SOURCE: README.md:16
`plugins/relay` (version 0.45.0, per its `plugin.json`) contains 23
```
Copied by Task 9 (the one live version string no check reads; it was added after the 0.45.0 cut and no earlier cut touched it).

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `documentation/reference/commands.html` | UPDATE | `/relay-qa-run` entry: five new `.kv` rows (classification, grounding, step vocabulary, redaction and run evidence, re-mint) and the stale IndexedDB registration clause replaced; `/relay-auth-scripts` entry: the `--refresh` role-set statement (AC-19) |
| `documentation/reference/scripts.html` | UPDATE | `qa-run.mjs` entry: six new rows with the exported constants and their values, the stale registration clause replaced, the `ground` usage line gains `--prefix` |
| `documentation/reference/redaction-policy.html` | UPDATE | New `QA runner evidence` section mirroring the plugin-owned policy (docs-update DQ12), subtitle and Related list |
| `documentation/reference/validation-checks.html` | UPDATE | `qa-run-contract` and `auth-secrecy` summary rows and sections list the rule sets added since 0.44.0, verbatim finding messages, and real test counts |
| `documentation/guide/validation-suite.html` | UPDATE | The `auth-secrecy` and `qa-run-contract` rows name the new rule sets |
| `documentation/roadmap/status.html` | UPDATE | New feature PRD row, a "Grounding and vocabulary v2" row in the manual-QA runner section, the Recorded callout, and the decision and anti-pattern counts re-derived |
| `documentation/assets/data/search-index.json` | UPDATE | The Commands, Scripts and Redaction policy excerpts name the 0.46.0 behavior (no new page, so no new entry) |
| `docs/api-reference.md` | UPDATE | The three QA rows describe the classification, grounding, redaction and vocabulary changes and list the 54 new exports (outside the docs-updater write scope, so the Implementer owns it) |
| `README.md` | UPDATE | The live version prose |
| `documentation/changelog.html` | UPDATE | Cut `0.46.0`: dated release heading, intro, Added and Changed lists, the section 7.5 manifest-bump line, a fresh empty `Unreleased` |
| `plugins/relay/.claude-plugin/plugin.json` | UPDATE | `version` `0.45.0` to `0.46.0` in the same change as the changelog heading |

## NOT Building (Scope Limits)

- **The install.** No task commits, stages, pushes, opens a PR or runs `claude plugin marketplace update`, `claude plugin update` or a restart. PRD lines 233, 272 and 273 name the install; it is the operator's, in the order given in `## Notes`, because `/relay-execute` never commits (`docs/decisions.md` 2026-05-18) and the install needs the work committed and merged.
- **Any edit to plugin-owned text or code.** `plugins/relay/commands/relay-qa-run.md`, `relay-auth-scripts.md`, `plugins/relay/resources/redaction-policy.md`, `plugins/relay/scripts/qa-run.mjs` and every other file under `plugins/relay/` except the manifest stay as phase 6 left them. The gaps `docs-update.md` records in them (DQ24, DQ27, DQ31) are operator follow-ups; the pages state only what the document and the code state today.
- **Any entry in `docs/decisions.md` or `docs/anti-patterns.md`.** Both are mirrored into `documentation/governance/*.html` by `decisions-mirror` and `anti-patterns-mirror`; the candidate decisions C17 to C22 and the questions DQ21 to DQ33 are open operator decisions no phase may take, and a page that must mention behavior a candidate governs describes the behavior and never the candidate.
- **A new page, a NAV entry, a CSS or JS change or a new top-level folder.** The five pages the PRD names (plus the validation-suite guide, the status page and the API reference) exist already, so the NAV array in `assets/js/app.js` is unchanged; the three-file rule is met by the search-index excerpts and the changelog entry.
- **Any test file, any validation check or any change to the check count.** The Implementer authors zero test files (R-X strict); the count stays 28 and the test pair owns any assertion this release makes stale.
- **A change to any frozen surface:** `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md`, `plugins/relay/commands/relay-qa-report.md`, `plugins/relay/scripts/visual/capture.mjs` (PRD AC-14); the kit login template and `KIT_TEMPLATE_ID` are byte-identical too (AC-13).
- **`docs/domain/*` and `docs/context/*`.** The implement-time docs-sync pass owns them; this plan writes neither.
- **The dogfood or any claim that the metrics hold.** Phase 8 measures the amended metrics; no page says they are met.
- **Unrelated stale content.** `docs/development.md` ("8 static consistency checks"), `documentation/guide/installation.html` ("Updating relay"), the other rows of the "Unit tests" column of `validation-checks.html` and `concepts/prp-artifacts.html` are not this feature's and stay.

## Step-by-Step Tasks

Tasks run in order. Every edit uses the `Edit` tool with the anchors named below (never a `Write` of a whole page: pinned sentences on very long single lines must not move). Each anchor is quoted from the file as it is now; if an anchor is not unique in its file, lengthen it with the neighboring words, do not widen the edit. HTML entities follow each page's own usage (`&mdash;`, `&rsquo;`, `&rarr;`, `&ndash;`); no emoji, no inline `style`, no absolute path.

### Task 1: UPDATE documentation/reference/commands.html

- **ACTION**: Delivers AC-A3, AC-A4, AC-A5, AC-A6, AC-A7. Three edits.
  1. In the `/relay-auth-scripts` entry (id `relay-auth-scripts`), replace the anchor `<code>--refresh</code> adds <code>mint</code> to roles lacking it without changing a set value.</dd>` with the same text without the closing `</dd>` followed by:
     ` A run selects the roles of the approved model&rsquo;s matrix, narrowed by <code>--role</code>, and <code>--refresh</code> regenerates only the scripts of those roles that already exist: a selected role with no script is generated exactly as without <code>--refresh</code> and is not reported as refreshed, so a kit narrower than the matrix is refreshed for its own roles only, and a role the kit holds that the matrix does not list is not selected and its script is left as it is.</dd>`
  2. In the `/relay-qa-run` entry (id `relay-qa-run`), replace the anchor `it registers IndexedDB record keys and values as secrets beside cookie, localStorage and token values; and the login halts` with `it registers session values for redaction source-first (see Redaction and run evidence below); and the login halts`. Everything else of that long line stays, including the five `FAILED_MINT_*` names and `240 seconds` that tests pin.
  3. In the same entry, after the anchor `See <a href="scripts.html#qa-run">qa-run.mjs</a> and <a href="scripts.html#qa-query">qa-query.mjs</a>.</dd>` insert these five rows (a new line each, eight spaces of indent):

```html
        <dt>Classification</dt>
        <dd>Every plan entry carries a <code>class</code> that the planner declares before the run: <code>automatable</code>, <code>needs-a-new-driver</code>, <code>human-by-nature</code> or <code>blocked-by-product</code>. An entry that does not execute its case declines it with a <code>reason_code</code> from a closed catalogue and no steps: <code>UNGROUNDABLE_AFTER_INTERACTION</code>, <code>EXTERNAL_CHANNEL</code>, <code>VISUAL_JUDGEMENT</code>, <code>VOCABULARY_GAP</code>, <code>STEP_UNGROUNDED</code>, <code>PRODUCT_DEFECT</code> or <code>STATE_UNCONFIRMED</code>. The eighth member, <code>PARTIAL_REMAINDER</code>, is derived by the runner and never declared. A code outside the catalogue makes the entry <code>PLAN_ENTRY_INVALID</code>, and a case the plan omits is <code>NO_PLAN_ENTRY</code>, a planner defect reported as <code>unclassified</code>. The runner validates and echoes the class and never infers it. <code>results.json</code> carries a <code>classification</code> block with the per-class counts, the driver-executed rate over the automatable class and the objective steps executed and total; a partially executed case is never counted in the rate, and the four-key <code>counts</code> partition is unchanged.</dd>
        <dt>Grounding</dt>
        <dd><code>qa-run.mjs ground</code> plans from the settled page, never from its first paint. It reads the accessibility snapshot repeatedly and writes the file only once two successive snapshots, 1 second apart, are equal within 20 seconds; a page that never settles ends <code>GROUND_UNSTABLE</code> with a non-zero exit and no file. The visible-text candidates include paragraph, list-item and cell lines. With <code>--prefix '&lt;json&gt;'</code> the command first replays at most 5 flat <code>goto</code>, <code>click</code> and <code>fill</code> steps of the case itself, through the local-only guard and with the role&rsquo;s session, and writes the snapshot taken afterwards to its own <code>--after-&lt;digest&gt;</code> file beside the plain one, so an element that exists only after an interaction can be grounded. A malformed prefix exits 2 with <code>GROUND_PREFIX_INVALID</code>, and a step that matches no element or several, or that cannot be performed, halts <code>GROUND_PREFIX_FAILED</code>; both write nothing. A replayed <code>click</code> or <code>fill</code> is a real interaction with the local application, made at plan time and never undone. Under Windows Git Bash a leading-slash <code>--route</code> needs <code>MSYS_NO_PATHCONV=1</code>. The interval, the bound and the cap of the prefix are chosen, not measured.</dd>
        <dt>Step vocabulary</dt>
        <dd>Five additions to the closed step vocabulary, each a flat step with a marked literal example in the command. <code>"session": "none"</code> on an <code>http</code> <code>request</code> step sends it with no cookie, no storage state and no derived header, through the same local-only guard. <code>expect_value</code> compares the value of an input with <code>equals</code>, <code>contains</code> or <code>not_empty</code> and records which comparison ran and whether it passed, never the value. <code>expect_not_visible</code> passes only when a grounded locator is hidden or absent and is valid only after a positive step on the same route since the last <code>goto</code>, so that it cannot pass on a page that never rendered. <code>expect_state</code> asserts <code>expanded</code>, <code>disabled</code> or <code>checked</code> against a boolean <code>equals</code>. A value, a state and an absence are re-read for up to 5 seconds. <code>expect_requests</code> counts the requests the page issues: a <code>method</code>, a <code>url_contains</code> path of at most 200 characters and a <code>count</code> from 0 to 100, counted from the start of the case&rsquo;s last <code>goto</code>, <code>click</code> or <code>fill</code> until 2 seconds after the step starts, with service workers blocked for a case that carries it. A matching request to a host the local-only guard does not approve ends the case <code>FAILED_NON_LOCAL_TARGET</code> with nothing asserted. Its evidence file <code>evidence/case-&lt;index&gt;.requests-&lt;step&gt;.json</code> lists, for each matching request, only the method, the host and the path (at most 50 are listed and the observed count stays exact), with a listed path cut to its first 200 characters after redaction. A path can still carry an identifier the redaction table does not recognize, an e-mail address included: the rule that withholds an e-mail address applies to snapshot entries only, and the file sits in the ignored <code>evidence/</code> directory. The numbers of these steps (5 seconds, 2 seconds, 100, 50 and 200) are chosen, not measured.</dd>
        <dt>Redaction and run evidence</dt>
        <dd>Session values are registered for redaction source-first: the token artifact, the declared <code>sessionCookie</code> and the cookie of every <code>api_origins</code> entry are always registered, and every other cookie, <code>localStorage</code> and IndexedDB string (record keys included) only when it is at least 12 characters long, has an entropy of at least 3.0 bits per character and is not a part of the target origin. The floor is a judgment, not a measurement: a short or low-entropy value in an undeclared cookie is not masked by value, so a cookie that carries a secret is declared as <code>sessionCookie</code> or in <code>api_origins</code>. <code>init</code> writes a <code>.gitignore</code> inside every new run directory that ignores <code>grounding/</code> and <code>evidence/</code>, because snapshots, screenshots and response bodies can hold personal data that no redaction table recognizes, and proves the rules with <code>git check-ignore</code> before anything is written. Its output ends with <code>IGNORE_PROOF: proven</code>, or with <code>IGNORE_PROOF: not-applicable</code> outside a git work tree; inside one, an unproven rule halts <code>FAILED_IGNORE_UNPROVEN</code> on <code>init</code>, <code>ground</code> and <code>run</code> and no evidence is written. <code>results.json</code> and <code>plan.json</code> stay tracked. A typed <code>fill</code> value is recorded in a post-interaction snapshot&rsquo;s <code>prefix</code> only as a SHA-256 digest, but the snapshot&rsquo;s <code>entries</code> are page text and can echo a value the page renders back. See <a href="redaction-policy.html#qa-runner-evidence">Redaction policy</a>.</dd>
        <dt>Re-mint</dt>
        <dd>When a <code>minted</code> role&rsquo;s login script halts <code>FAILED_PROBE_MARKER_ABSENT</code> right after it minted, the runner runs the kit login script once more with <code>--force</code>, at most once per role per run, and never runs the mint command itself. A proven second attempt yields the session, and a second halt leaves the role <code>blocked</code> with the code of that halt, which is <code>FAILED_PROBE_MARKER_ABSENT</code> again when the proof fails again. A role whose mechanism is not <code>minted</code>, and every other halt, is never retried, and the login template and its stamp are unchanged. The cap is chosen, not measured: every extra run mints again and rotates the account&rsquo;s session.</dd>
```

- **MIRROR**: `# SOURCE: documentation/reference/commands.html:344-345` (the two-line `<dt>`/`<dd>` row shape); `# SOURCE: docs/domain/glossary.md:535-547` (the floor stated by source, then the numbers).
- **VALIDATE**:

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
node --input-type=module -e '
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
const m = await import(pathToFileURL(path.resolve("plugins/relay/scripts/qa-run.mjs")).href);
const t = fs.readFileSync("documentation/reference/commands.html", "utf8");
const bad = [];
const qa = t.slice(t.indexOf(`<h3 id="relay-qa-run">`), t.indexOf(`<h3 id="relay-qa-seed">`));
const au = t.slice(t.indexOf(`<h3 id="relay-auth-scripts">`), t.indexOf(`<h3 id="relay-qa-run">`));
for (const s of ["is not reported as refreshed", "its script is left as it is"]) if (!au.includes(s)) bad.push("auth-scripts entry lacks: " + s);
for (const s of ["Classification", "Grounding", "Step vocabulary", "Redaction and run evidence", "Re-mint"]) {
  const n = qa.split(`<dt>${s}</dt>`).length - 1;
  if (n !== 1) bad.push(`the qa-run entry must carry exactly one <dt>${s}</dt>, found ${n}`);
}
if (qa.includes("registers IndexedDB record keys and values as secrets beside cookie")) bad.push("the stale registration clause is still present");
for (const k of Object.keys(m.REASON_CATALOGUE)) if (!qa.includes(`<code>${k}</code>`)) bad.push("catalogue code not named: " + k);
for (const k of m.CASE_CLASSES) if (!qa.includes(`<code>${k}</code>`)) bad.push("class not named: " + k);
for (const s of [`${m.GROUND_POLL_INTERVAL_MS / 1000} second apart, are equal within ${m.GROUND_STABLE_BOUND_MS / 1000} seconds`, `at most ${m.GROUND_PREFIX_MAX_STEPS} flat`, `at least ${m.SESSION_VALUE_MIN_LENGTH} characters long`, `at least ${m.SESSION_VALUE_MIN_ENTROPY.toFixed(1)} bits per character`, `for up to ${m.ASSERT_SETTLE_MS / 1000} seconds`, `from 0 to ${m.EXPECT_REQUESTS_COUNT_MAX}`, `${m.EXPECT_REQUESTS_SETTLE_MS / 1000} seconds after the step starts`, `at most ${m.EXPECT_REQUESTS_EVIDENCE_MAX} are listed`]) if (!qa.includes(s)) bad.push("derived number not stated: " + s);
if (m.LOGIN_REMINT_MAX_RETRIES !== 1) bad.push("the re-mint cap is no longer 1: reword the Re-mint row");
for (const k of ["FAILED_MINT_UNCONFIRMED", "FAILED_MINT_COMMAND_MISSING", "FAILED_MINT_COMMAND", "FAILED_MINT_OUTPUT"]) if (!t.includes(k)) bad.push("pinned halt name removed: " + k);
if (!t.includes("240 seconds") || !t.includes("Twenty-three commands")) bad.push("a pinned token was removed");
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
console.log("PASS: commands.html describes the 0.46.0 runner and keeps its pinned tokens");
'
```

### Task 2: UPDATE documentation/reference/scripts.html

- **ACTION**: Delivers AC-A3, AC-A4, AC-A5, AC-A6, AC-A7. Five edits inside the `qa-run.mjs` entry (id `qa-run`, through the paragraph that follows its usage block).
  1. In the `UI grounding` row replace the anchor `which must match exactly one element at plan time and at run time, otherwise <code>STEP_UNGROUNDED</code>.</dd>` with the same text without `</dd>` followed by: ` The snapshot is written only once two successive accessibility snapshots, 1 second apart, are equal within 20 seconds (otherwise <code>GROUND_UNSTABLE</code>, exit 1, nothing written), its text candidates include paragraph, list-item and cell lines, and with <code>--prefix</code> it is taken after a replay of at most 5 <code>goto</code>, <code>click</code> and <code>fill</code> steps and written to its own <code>--after-&lt;digest&gt;</code> file.</dd>`
  2. In the `Session proof` row replace the anchor `it registers IndexedDB record keys and values as secrets beside cookie, localStorage and token values; and the login halts` with `it registers session values for redaction source-first (see Redaction floor and run evidence below); and the login halts`.
  3. Immediately before the line `        <dt>Invoked by</dt><dd><code>/relay-qa-run</code>. Also invocable directly.</dd>` insert these six one-line rows:

```html
        <dt>Classification</dt><dd>The plan carries a <code>class</code> per case (<code>CASE_CLASSES</code>: <code>automatable</code>, <code>needs-a-new-driver</code>, <code>human-by-nature</code>, <code>blocked-by-product</code>) and a declining entry a <code>reason_code</code> from the closed <code>REASON_CATALOGUE</code>; <code>PARTIAL_REMAINDER</code> is runner-owned (<code>RUNNER_OWNED_REASON_CODES</code>) and a plan may not declare it. A code or class outside the closed sets makes the entry <code>PLAN_ENTRY_INVALID</code>. <code>results.json</code> gains a <code>classification</code> block and a <code>class</code> and an <code>objective_steps</code> on each case; the four-key <code>counts</code> partition and the outcome vocabulary are unchanged.</dd>
        <dt>Stable grounding</dt><dd><code>ground</code> reads the accessibility snapshot every <code>GROUND_POLL_INTERVAL_MS</code> (1000) and writes only once two successive reads are equal within <code>GROUND_STABLE_BOUND_MS</code> (20000), else it halts <code>GROUND_UNSTABLE</code> (exit 1, no file). With <code>--prefix</code> it replays at most <code>GROUND_PREFIX_MAX_STEPS</code> (5) flat <code>goto</code>, <code>click</code> and <code>fill</code> steps, a <code>fill</code> value of at most <code>GROUND_PREFIX_VALUE_MAX</code> (200) characters, through the guard and with the role session; a malformed prefix exits 2 (<code>GROUND_PREFIX_INVALID</code>) and a step that cannot be performed on exactly one element halts <code>GROUND_PREFIX_FAILED</code>, both with nothing written. The snapshot taken after a replay is the <code>schema_version</code> 2 file <code>&lt;role&gt;--&lt;route&gt;--after-&lt;8 hex&gt;.snapshot.json</code> and records each typed value only as a SHA-256 digest.</dd>
        <dt>Redaction floor and run evidence</dt><dd>Session values are registered by source: the token artifact, the declared session cookie and every <code>api_origins</code> cookie always, any other cookie, <code>localStorage</code> or IndexedDB string only at <code>SESSION_VALUE_MIN_LENGTH</code> (12) characters and <code>SESSION_VALUE_MIN_ENTROPY</code> (3.0) bits per character, and never a part of the target origin. <code>init</code> writes the run directory&rsquo;s <code>.gitignore</code> (<code>RUN_IGNORE_RULES</code>: <code>grounding/</code> and <code>evidence/</code>) through the single write helper and proves it with <code>git check-ignore -q</code>, printing <code>IGNORE_PROOF: proven</code> or <code>IGNORE_PROOF: not-applicable</code>; an unproven rule inside a work tree halts <code>FAILED_IGNORE_UNPROVEN</code> on <code>init</code>, <code>ground</code> and <code>run</code>.</dd>
        <dt>Assertions and request count</dt><dd>Beyond the existing browser steps the validator accepts <code>expect_value</code>, <code>expect_not_visible</code>, <code>expect_state</code> (<code>EXPECT_STATES</code>) and <code>expect_requests</code>, and an <code>http</code> <code>request</code> step may carry <code>"session": "none"</code>. A value, a state and an absence are re-read for up to <code>ASSERT_SETTLE_MS</code> (5000) every <code>ASSERT_POLL_INTERVAL_MS</code> (100); an absence is valid only after a positive step (<code>POSITIVE_ASSERTION_ACTIONS</code>) on the same route since the last <code>goto</code>. <code>expect_requests</code> waits <code>EXPECT_REQUESTS_SETTLE_MS</code> (2000), accepts a <code>count</code> of at most <code>EXPECT_REQUESTS_COUNT_MAX</code> (100) and lists at most <code>EXPECT_REQUESTS_EVIDENCE_MAX</code> (50) requests, method, host and path only, in <code>evidence/case-&lt;index&gt;.requests-&lt;step&gt;.json</code>.</dd>
        <dt>Re-mint</dt><dd>A minted role whose kit login script halts <code>FAILED_PROBE_MARKER_ABSENT</code> is run once more with <code>--force</code> (<code>LOGIN_REMINT_MAX_RETRIES</code> (1); <code>shouldRemintLogin</code> decides it), never the mint command, and a second halt keeps its own code. The kit login template and its <code>KIT_TEMPLATE_ID</code> are unchanged.</dd>
        <dt>Chosen numbers</dt><dd>The stability interval and bound, the redaction floor, the prefix caps, the re-read and settle windows, the largest <code>count</code>, the listing of 50 requests, the 200-character cut of a listed path and the re-mint cap are chosen, not measured. The dogfood that follows this release recalibrates them.</dd>
```

  4. In the usage block replace the anchor `--route &lt;path&gt; [--role &lt;role&gt;] [--env-handle &lt;path&gt;]` (the `ground` line; the `run` line has no `--route`) with `--route &lt;path&gt; [--role &lt;role&gt;] [--env-handle &lt;path&gt;] [--prefix &lt;json&gt;]`.
  5. In the paragraph after the usage block replace the anchor `2 for bad arguments. The local-only guard runs before any request, login or write;` with `2 for bad arguments (a malformed <code>--prefix</code> is <code>GROUND_PREFIX_INVALID</code>, exit 2, with nothing written). The local-only guard runs before any request, login or write;`.
- **MIRROR**: `# SOURCE: documentation/reference/scripts.html:216` (the one-line row form); `# SOURCE: docs/domain/glossary.md:535-547`.
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
const bad = [];
for (const s of ["Classification", "Stable grounding", "Redaction floor and run evidence", "Assertions and request count", "Re-mint", "Chosen numbers"]) {
  const n = run.split(`<dt>${s}</dt>`).length - 1;
  if (n !== 1) bad.push(`the qa-run entry must carry exactly one <dt>${s}</dt>, found ${n}`);
}
const consts = [["GROUND_POLL_INTERVAL_MS", m.GROUND_POLL_INTERVAL_MS], ["GROUND_STABLE_BOUND_MS", m.GROUND_STABLE_BOUND_MS], ["GROUND_PREFIX_MAX_STEPS", m.GROUND_PREFIX_MAX_STEPS], ["GROUND_PREFIX_VALUE_MAX", m.GROUND_PREFIX_VALUE_MAX], ["SESSION_VALUE_MIN_LENGTH", m.SESSION_VALUE_MIN_LENGTH], ["SESSION_VALUE_MIN_ENTROPY", m.SESSION_VALUE_MIN_ENTROPY.toFixed(1)], ["ASSERT_SETTLE_MS", m.ASSERT_SETTLE_MS], ["ASSERT_POLL_INTERVAL_MS", m.ASSERT_POLL_INTERVAL_MS], ["EXPECT_REQUESTS_SETTLE_MS", m.EXPECT_REQUESTS_SETTLE_MS], ["EXPECT_REQUESTS_COUNT_MAX", m.EXPECT_REQUESTS_COUNT_MAX], ["EXPECT_REQUESTS_EVIDENCE_MAX", m.EXPECT_REQUESTS_EVIDENCE_MAX], ["LOGIN_REMINT_MAX_RETRIES", m.LOGIN_REMINT_MAX_RETRIES]];
for (const [k, v] of consts) if (!run.includes(`<code>${k}</code> (${v})`)) bad.push(`the entry does not state ${k} (${v})`);
for (const r of m.RUN_IGNORE_RULES) if (!run.includes(`<code>${r}</code>`)) bad.push("ignore rule not named: " + r);
for (const s of ["GROUND_UNSTABLE", "GROUND_PREFIX_INVALID", "GROUND_PREFIX_FAILED", "FAILED_IGNORE_UNPROVEN", "IGNORE_PROOF: proven", "IGNORE_PROOF: not-applicable", "paragraph, list-item and cell lines", "[--prefix &lt;json&gt;]", "registers session values for redaction source-first (see Redaction floor and run evidence below)"]) if (!run.includes(s)) bad.push("lacks: " + s);
if (!m.USAGE.includes("[--prefix <json>]")) bad.push("the runner USAGE no longer lists --prefix: reword the usage block");
if (run.includes("registers IndexedDB record keys and values as secrets beside cookie")) bad.push("the stale registration clause is still present");
for (const k of ["FAILED_MINT_UNCONFIRMED", "FAILED_MINT_COMMAND_MISSING", "FAILED_MINT_COMMAND", "FAILED_MINT_OUTPUT"]) if (!t.includes(k)) bad.push("pinned halt name removed: " + k);
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
console.log("PASS: scripts.html describes the 0.46.0 qa-run.mjs with its exported numbers");
'
```

### Task 3: UPDATE documentation/reference/redaction-policy.html

- **ACTION**: Delivers AC-A4 and, through its post-interaction and observed-request bullets, the caveats of AC-A6. Three edits.
  1. Subtitle: replace the anchor `before being written to the versioned report that travels with the PR.</p>` with `before being written to the versioned report that travels with the PR. A further section covers the evidence the QA runner writes: which session values it registers, and what keeps snapshots, screenshots and personal data out of git.</p>`.
  2. Insert the section below immediately above the line `      <h2 id="what-this-is-not">What this policy is NOT</h2>` (blank line after it). The text mirrors `plugins/relay/resources/redaction-policy.md` lines 177-266 with the HTML entities of this page; two sentences are added to the last bullet, marked here by the words "A listed path is also cut" and "Unlike a snapshot entry".

```html
      <h2 id="qa-runner-evidence">QA runner evidence: session values, snapshots, screenshots and personal data</h2>

      <p>The QA runner keeps its own redaction table in memory and writes evidence under <code>PRPs/reports/&lt;feature&gt;/qa-run/&lt;run-id&gt;/</code>. Substring redaction is only as precise as the values registered, and a snapshot or a screenshot can show data no table knows. This section states what the runner registers, why, and what keeps the rest out of git. The packaged copy of the policy, <code>plugins/relay/resources/redaction-policy.md</code>, is the source of this section.</p>

      <h3 id="session-values-source-first">Session values are registered source-first</h3>

      <p>Registering every string of a saved session corrupts the evidence the operator reads: on a recorded run <code>localhost</code>, <code>false</code> and <code>MIDDLE</code> became <code>[REDACTED]</code> inside 23 URLs. The runner therefore registers a session value by its source:</p>

      <ul>
        <li><strong>Always registered</strong> (any entropy; the table&rsquo;s absolute 4-character minimum still applies): the token artifact, the cookie the role declares as its <code>sessionCookie</code>, the cookie named by each <code>api_origins</code> entry, env values selected by Layer 1 or Layer 2 names, <code>redact: true</code> captures and <code>redact_columns</code> values.</li>
        <li><strong>Registered above a floor</strong>: every other cookie, <code>localStorage</code> and IndexedDB string, record keys included, only when it is at least 12 characters long and has a Shannon entropy of at least 3.0 bits per character.</li>
        <li><strong>Never registered</strong>: a part of the target origin (scheme, host, port, host and port, the origin or a URL on it) and short literals such as <code>true</code>, <code>false</code>, <code>null</code> and small integers (the length gate refuses them).</li>
      </ul>

      <p>The floor is a judgment, not a measurement. No scanner documents a minimum length (detect-secrets documents entropy limits of 4.5 for base64 and 3.0 for hex, gitleaks an example of 3.5). The numbers are calibrated on the recorded values of a real scan, whose six non-secrets were all shorter than the floor and below its entropy.</p>

      <div class="callout callout--warn">
        <div class="callout__title">Failure mode</div>
        <p>A short or low-entropy secret held by a cookie nobody declared is not masked by value. Four things back it: the Layer 1 value regexes; the structural masking of every cookie and <code>localStorage</code> <code>value</code> field and of every secret-named property in each JSON evidence file; the ignore rule below; and the secrecy scan of the dogfood. The remedy is to declare such a cookie as <code>sessionCookie</code> or in <code>api_origins</code>, or to add a <code>regex:</code> line to <code>PRPs/redaction-extensions.txt</code>.</p>
      </div>

      <h3 id="snapshots-personal-data">Snapshots, screenshots and personal data</h3>

      <p>An accessibility snapshot lists locator names and visible text, a screenshot is pixels, and a response or row body is whatever the application returned for the test account. Any of them can hold personal data (a task title, a person&rsquo;s name, an e-mail address) that no secret table recognizes.</p>

      <ul>
        <li><strong>What the runner withholds.</strong> A snapshot entry that carries a registered secret, an e-mail address or a <code>regex:</code> match is withheld, and a screenshot is withheld (redacted text is written instead) when the page text carries a registered secret. The runner cannot recognize free-text personal data.</li>
        <li><strong>Where the evidence lives.</strong> Every grounding snapshot, screenshot, redacted-text file and evidence body lives under the run directory&rsquo;s <code>grounding/</code> and <code>evidence/</code>. The run&rsquo;s own <code>.gitignore</code> ignores both. It is written through the runner&rsquo;s single write helper and proven with <code>git check-ignore -q</code> for a path of each kind before anything is written. <code>results.json</code> and <code>plan.json</code> stay tracked and hold no page text and no input value.</li>
        <li><strong>When the proof does not hold.</strong> With git present and the proof unproven, the runner halts <code>FAILED_IGNORE_UNPROVEN</code> and writes no snapshot and no screenshot. When the run directory is not inside a git work tree, nothing there can be committed and the proof is recorded as <code>not-applicable</code>.</li>
        <li><strong>Input values.</strong> An input value asserted by the runner is never written, only the result of the comparison: the evidence names which comparison ran and whether it passed, and the final screenshot masks the located field, so the value reaches no evidence file, no result, no reason and no terminal line.</li>
        <li><strong>Post-interaction snapshots.</strong> A snapshot written after the <code>ground</code> mode replayed a prefix of <code>goto</code>, <code>click</code> and <code>fill</code> steps lives under <code>grounding/</code> beside the plain snapshot of its route and is withheld by the same rules, entry by entry. A prefix locator that names a withheld value is refused before the browser starts. The recorded <code>prefix</code> holds no typed value, only a SHA-256 digest, never in clear, and <code>ground</code> prints the value on no terminal line and writes it to no other file. The <code>entries</code> are page text read after the interaction, so they can echo a typed value the page renders back: an entry is withheld only for a registered secret, an e-mail address or a <code>regex:</code> match, and a typed value is not registered. That value comes from the report&rsquo;s own steps, which the report file already holds, and the snapshot sits under the run directory&rsquo;s ignored <code>grounding/</code>, whose ignore rule is proven before it is written.</li>
        <li><strong>Observed requests.</strong> An <code>expect_requests</code> step watches the requests the page issues, and the runner reads nothing from a request but its method and its URL: never a header, a cookie, a token or a body. For each request that matches the step the evidence file records the method, the host and the path (at most 50 are listed, the observed count staying exact), with the query string and the fragment dropped in memory, and the expected and observed counts. A registered secret that appears in a path is masked like any evidence string, but a path can still carry an identifier or a name the table does not recognize, so the file lives under the run directory&rsquo;s ignored <code>evidence/</code>, whose ignore rule is proven before anything is written, and for the step <code>results.json</code> carries only the result, the counts of a failing reason and the path of that file. A listed path is also cut to its first 200 characters after redaction, an evidence-size cap on the written listing only. Unlike a snapshot entry, a path is not withheld for an e-mail address: the redaction masks a registered secret, a token-shaped value and a <code>regex:</code> match, and nothing else.</li>
      </ul>
```

  3. In the `Related` list, after the line `        <li><a href="../concepts/prp-artifacts.html">PRP artifact paths — where redacted reports live</a></li>` insert `        <li><a href="commands.html#relay-qa-run"><code>/relay-qa-run</code> &mdash; the runner that applies the QA evidence rules</a></li>`.
- **MIRROR**: `# SOURCE: documentation/reference/redaction-policy.html:143-146` (heading, list and bold-label bullet forms); `# SOURCE: docs/domain/glossary.md:535-547`.
- **VALIDATE**:

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
node --input-type=module -e '
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
const m = await import(pathToFileURL(path.resolve("plugins/relay/scripts/qa-run.mjs")).href);
const t = fs.readFileSync("documentation/reference/redaction-policy.html", "utf8");
const md = fs.readFileSync("plugins/relay/resources/redaction-policy.md", "utf8");
const bad = [];
const i = t.indexOf(`<h2 id="qa-runner-evidence">`), j = t.indexOf(`<h2 id="what-this-is-not">`);
if (!(i > 0 && j > i)) bad.push("the QA runner evidence section is missing or not above the closing section");
const sec = i > 0 && j > i ? t.slice(i, j) : "";
const heading = /^## (QA runner evidence: .*)$/m.exec(md);
if (!heading || !sec.includes(`>${heading[1]}</h2>`)) bad.push("the section heading does not equal the plugin policy heading");
for (const s of [`<h3 id="session-values-source-first">`, `<h3 id="snapshots-personal-data">`, "FAILED_IGNORE_UNPROVEN", "not-applicable", "git check-ignore -q", "PRPs/redaction-extensions.txt", "SHA-256 digest", "can echo a typed value the page renders back", "Unlike a snapshot entry, a path is not withheld for an e-mail address"]) if (!sec.includes(s)) bad.push("section lacks: " + s);
for (const s of [`at least ${m.SESSION_VALUE_MIN_LENGTH} characters long and has a Shannon entropy of at least ${m.SESSION_VALUE_MIN_ENTROPY.toFixed(1)} bits per character`, `at most ${m.EXPECT_REQUESTS_EVIDENCE_MAX} are listed`]) if (!sec.includes(s)) bad.push("derived number not stated: " + s);
for (const label of [...md.slice(md.indexOf("## QA runner evidence"), md.indexOf("## What this policy is NOT")).matchAll(/^- \*\*([^*]+\.)\*\*/gm)].map((x) => x[1])) if (md.indexOf(`**${label}**`) > md.indexOf("## QA runner evidence") && !sec.includes(`<strong>${label}</strong>`)) bad.push("bullet label not mirrored: " + label);
if (!t.includes(`href="commands.html#relay-qa-run"`)) bad.push("the Related link to the command is missing");
if (!fs.readFileSync("documentation/reference/commands.html", "utf8").includes(`id="relay-qa-run"`)) bad.push("the link target id is missing");
if (!t.includes("A further section covers the evidence the QA runner writes")) bad.push("the subtitle was not updated");
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
console.log("PASS: redaction-policy.html mirrors the QA runner evidence section");
'
```

### Task 4: UPDATE documentation/reference/validation-checks.html

- **ACTION**: Delivers AC-A8. Seven edits. Let `N` be the number the real test run reports for `scripts/validate/checks/qa-run-contract.test.mjs` and `M` the number for `scripts/validate/checks/auth-secrecy.test.mjs`, each read from `node --test --test-reporter=tap <file>` (the line `# tests <n>`); write the two numbers you read, never a count of `test(` calls. The summary of that reporter, as it ended for `qa-run-contract.test.mjs` when this plan was written (the file runs 15 tests, a count that moves only when the test pair edits the file), is the verbatim block `1..15`, `# tests 15`, `# suites 0`, `# pass 15`, `# fail 0`, `# cancelled 0`, `# skipped 0`, `# todo 0`, `# duration_ms <ms>`.
  1. Summary table, the `auth-secrecy` row: append to its description cell, before `</td><td>`, the sentence `; with the run-evidence pins also the QA runner ignore rules, its session-value floor and the policy section that states both`, and set the last cell to `M`.
  2. Summary table, the `qa-run-contract` row: append to its description cell (before the closing `</td>` of that cell) `, plus the opt-in rule sets for the reason-code catalogue and classification, stable grounding, run-evidence privacy, the step vocabulary, the grounding prefix and the request count with the bounded re-mint`, and replace its last cell `&mdash;` with `N`.
  3. `auth-secrecy` section: insert a new paragraph immediately before the line starting `      <p><strong>Passes when</strong> the ignore resource carries exactly the required rules`:

```html
      <p><strong>Run evidence.</strong> A further rule set, switched on by the real-tree wrapper, pins the privacy of the QA runner evidence. <code>plugins/relay/scripts/qa-run.mjs</code> must still name <code>FAILED_IGNORE_UNPROVEN</code> and <code>check-ignore</code>, export its ignore rules as <code>RUN_IGNORE_RULES</code> covering <code>grounding/</code> and <code>evidence/</code> with no re-include, no blanket rule and no rule that hides <code>results.json</code>, <code>plan.json</code> or <code>.gitignore</code>, and export the session-value floor as <code>SESSION_VALUE_MIN_LENGTH</code> and <code>SESSION_VALUE_MIN_ENTROPY</code>. <code>plugins/relay/resources/redaction-policy.md</code> must carry the run-evidence section and its two subsections, the ignore, proof and halt tokens, and the same two floor numbers the runner exports.</p>
```

  4. `auth-secrecy` section, the findings `<pre>`: replace the final line `plugins/relay/resources/auth-kit.gitignore:1 &mdash; missing or unreadable file: plugins/relay/resources/auth-kit.gitignore</code></pre>` with the same line (without `</code></pre>`) followed by two new lines and the closing tags:
     `plugins/relay/scripts/qa-run.mjs:1 &mdash; runner script does not define: export const RUN_IGNORE_RULES = Object.freeze([...]);` and `plugins/relay/scripts/qa-run.mjs:1 &mdash; runner ignore rules hide the tracked side: results.json`.
  5. `auth-secrecy` section, the unit-test paragraph: replace the anchor `<p><strong>Unit tests (23)</strong> in <code>scripts/validate/checks/auth-secrecy.test.mjs</code>.` with the same text where `23` is `M` (`M` was 23 when this plan was written, so this edit changes nothing unless the test pair has since changed the file; the summary cell of item 1 is then 23 too).
  6. `qa-run-contract` section: insert a new paragraph immediately before the line starting `      <p><strong>Passes when</strong> the script and the command carry every required token`:

```html
      <p><strong>Opt-in rule sets.</strong> The real-tree wrapper also switches on rule sets that pin each capability the runner has gained. <strong>Catalogue:</strong> the closed reason-code catalogue and the four case classes are defined once, the catalogue holds the seven codes the plan contract names and never the omitted-case marker, every code and class is documented in the command, and every marked plan-entry example validates against the validator of the runner itself. <strong>Ground:</strong> the usage text lists the mode and its flags, the <code>GROUND_UNSTABLE</code> halt is named, the ground mode holds no swallowed readiness wait, and the command documents the halt, the <code>MSYS_NO_PATHCONV=1</code> note and the interval and bound the exported constants carry. <strong>Privacy:</strong> the <code>FAILED_IGNORE_UNPROVEN</code> halt and the <code>IGNORE_PROOF</code> line are named, the ignore rules are defined once and proved in <code>init</code>, in <code>ground</code> before the browser and in <code>run</code> before the redaction table, and the command documents the session-value floor the runner exports. <strong>Vocabulary:</strong> the request-options helper is defined once, a session-less step routes through the anonymous fetch, each new assertion is named in the locator step, the validators accept and refuse the documented shapes, and the command carries a marked literal example of each; every message starts with <code>vocabulary:</code>. <strong>Prefix:</strong> the prefix cap is defined once, both prefix halts are named, <code>--prefix</code> is in the usage text and the replay runs after the ignore proof and before the stable wait; every message starts with <code>prefix:</code>. <strong>Network:</strong> the settle window and the re-mint cap are defined once, the request-observation helpers read the method and the URL and nothing else, and the login script is run from exactly one site in a bounded loop; every message starts with <code>network:</code>.</p>
```

  7. `qa-run-contract` section: in the findings `<pre>` replace the line `PRPs/reports/example/qa-run/20261002T100000000Z/results.json:1 &mdash; cases[0] is pass with an empty evidence array</code></pre>` with the same line (without `</code></pre>`) followed by two lines and the closing tags: `plugins/relay/scripts/qa-run.mjs:1 &mdash; prefix: the runner script must contain the named halt GROUND_PREFIX_INVALID` and `plugins/relay/commands/relay-qa-run.md:1 &mdash; prefix: the runner command must document the ground prefix: it must contain --prefix`. Then replace the paragraph `<p><strong>Unit tests:</strong> none yet; the test pair authors them after the implementation lands.</p>` with:

```html
      <p><strong>Unit tests (N).</strong> <code>scripts/validate/checks/qa-run-contract.test.mjs</code> hands the check the real runner script and command as a passing baseline, mutates one anchored token in the in-memory copy and asserts the exact finding; its headline proof emits a fifth outcome value from the real runner source and requires the check to fail at the offending line. The rule sets above are exercised by the feature suites beside it under <code>scripts/validate/checks/</code>, the files named <code>qa-run-*.test.mjs</code>.</p>
```
  with `N` written as the number you read.
- **MIRROR**: `# SOURCE: documentation/reference/validation-checks.html:375` (the paragraph replaced); the finding messages are quoted from `scripts/validate/checks/qa-run-contract.mjs:378` and `:397` and `scripts/validate/checks/auth-secrecy.mjs:108` and `:117`, and every other entry of the page uses the `<strong>Unit tests (n).</strong>` form.
- **VALIDATE**:

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
node --input-type=module -e '
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const t = fs.readFileSync("documentation/reference/validation-checks.html", "utf8");
const bad = [];
const tap = (f) => {
  let out = "";
  try { out = execFileSync(process.execPath, ["--test", "--test-reporter=tap", f], { encoding: "utf8", maxBuffer: 1 << 26 }); }
  catch (e) { bad.push("the test file is red: " + f); out = String(e.stdout || ""); }
  const mm = /^# tests (\d+)$/m.exec(out);
  if (!mm) bad.push("no tap summary for " + f);
  return mm ? Number(mm[1]) : -1;
};
const qaN = tap("scripts/validate/checks/qa-run-contract.test.mjs");
const auN = tap("scripts/validate/checks/auth-secrecy.test.mjs");
const slice = (a, b) => t.slice(t.indexOf(a), t.indexOf(b));
const qaSec = slice(`<h2 id="qa-run-contract">`, `<h2 id="lane-derivation">`);
const auSec = slice(`<h2 id="auth-secrecy">`, `<h2 id="auth-local-guard-sites">`);
const row = (id) => new RegExp(`<tr><td><a href="#${id}">${id}</a></td><td>[\\s\\S]*?</td><td>([^<]*)</td></tr>`).exec(t);
const rq = row("qa-run-contract"), ra = row("auth-secrecy");
if (!rq || rq[1] !== String(qaN)) bad.push(`the qa-run-contract summary cell is ${rq && rq[1]}, the test run reports ${qaN}`);
if (!ra || ra[1] !== String(auN)) bad.push(`the auth-secrecy summary cell is ${ra && ra[1]}, the test run reports ${auN}`);
if (!qaSec.includes(`<strong>Unit tests (${qaN}).</strong>`)) bad.push("the qa-run-contract section does not state Unit tests (" + qaN + ")");
if (!auSec.includes(`<strong>Unit tests (${auN})</strong>`)) bad.push("the auth-secrecy section does not state Unit tests (" + auN + ")");
if (qaSec.includes("none yet")) bad.push("the stale none-yet sentence is still present");
for (const s of ["<strong>Opt-in rule sets.</strong>", "<code>vocabulary:</code>", "<code>prefix:</code>", "<code>network:</code>", "prefix: the runner script must contain the named halt GROUND_PREFIX_INVALID", "prefix: the runner command must document the ground prefix: it must contain --prefix", "plus the opt-in rule sets for the reason-code catalogue and classification, stable grounding, run-evidence privacy, the step vocabulary, the grounding prefix and the request count with the bounded re-mint", "with the run-evidence pins also the QA runner ignore rules, its session-value floor and the policy section that states both"]) if (!t.includes(s)) bad.push("lacks: " + s);
for (const s of ["<strong>Run evidence.</strong>", "RUN_IGNORE_RULES", "SESSION_VALUE_MIN_LENGTH", "runner script does not define: export const RUN_IGNORE_RULES = Object.freeze([...]);", "runner ignore rules hide the tracked side: results.json"]) if (!auSec.includes(s)) bad.push("auth-secrecy section lacks: " + s);
const src = fs.readFileSync("scripts/validate/checks/qa-run-contract.mjs", "utf8");
for (const frag of ["the runner script must contain the named halt", "the runner command must document the ground prefix: it must contain"]) if (!src.includes(frag)) bad.push("a quoted finding message is no longer in the check source: " + frag);
const asrc = fs.readFileSync("scripts/validate/checks/auth-secrecy.mjs", "utf8");
for (const frag of ["runner script does not define: export const RUN_IGNORE_RULES = Object.freeze([...]);", "runner ignore rules hide the tracked side: "]) if (!asrc.includes(frag)) bad.push("a quoted finding message is no longer in the check source: " + frag);
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
console.log(`PASS: validation-checks.html describes the extended checks (qa-run-contract ${qaN} tests, auth-secrecy ${auN} tests)`);
'
```

### Task 5: UPDATE documentation/guide/validation-suite.html

- **ACTION**: Delivers AC-A8. Two edits in the table of checks.
  1. `auth-secrecy` row: replace the anchor `and the redaction policy keeps its credential-store coverage.</td></tr>` with `and the redaction policy keeps its credential-store coverage. It also pins the run-evidence rules of the QA runner: the exported ignore rules (<code>grounding/</code> and <code>evidence/</code>, never the tracked <code>results.json</code> and <code>plan.json</code>), the two session-value floor constants, and the policy section that states them.</td></tr>`.
  2. `qa-run-contract` row: replace the anchor `(no fifth outcome, counts that partition the cases, real UTC stamps, an open human gate, evidence on every pass and fail).</td></tr>` with `(no fifth outcome, counts that partition the cases, real UTC stamps, an open human gate, evidence on every pass and fail). It also pins the vocabulary the runner has gained: the closed reason-code catalogue and the four classes, the stable-grounding halt, the run-evidence ignore proof, the session-less request and the three assertions with their absence anchor, the grounding prefix and its cap, and the request count with the bounded re-mint, each against the validators of the runner itself and the literal examples in its command.</td></tr>`.
  The page states no check count and none is added.
- **MIRROR**: `# SOURCE: documentation/reference/validation-checks.html:375` is the sibling entry whose wording the two sentences summarize; the rows keep the page's existing one-cell-per-check form.
- **VALIDATE**:

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
node -e '
const fs = require("node:fs");
const t = fs.readFileSync("documentation/guide/validation-suite.html", "utf8");
const bad = [];
for (const s of ["It also pins the run-evidence rules of the QA runner: the exported ignore rules", "It also pins the vocabulary the runner has gained: the closed reason-code catalogue and the four classes", "each against the validators of the runner itself and the literal examples in its command."]) {
  const n = t.split(s).length - 1;
  if (n !== 1) bad.push(`expected exactly once (${n}): ${s}`);
}
const rows = (id) => (t.match(new RegExp(`<tr><td><code>${id}</code></td>`, "g")) || []).length;
if (rows("auth-secrecy") !== 1 || rows("qa-run-contract") !== 1) bad.push("a check row was duplicated or removed");
if (/\b(28|29) (static )?checks\b/.test(t)) bad.push("this page must state no check count");
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
console.log("PASS: validation-suite.html names the new rule sets once each");
'
```

### Task 6: UPDATE documentation/roadmap/status.html

- **ACTION**: Delivers AC-A9. Four edits.
  1. Feature PRD table: replace the single line `            <td>Minted sessions: a confirmed local command issues each role's session, no login</td>` with itself followed by these lines (the original `</tr>` that follows then closes the new row):

```html
          </tr>
          <tr>
            <td><code>qa-runner-grounding-vocabulary-v2</code></td>
            <td>8</td>
            <td><span class="badge badge--partial">phases 1&ndash;7 shipped, dogfood pending</span></td>
            <td>0.46.0</td>
            <td>Stable grounding, text candidates, redaction floor, run-evidence ignore, reason-code classification and the session-less, input-value, absence, state, prefix and request-count steps</td>
```

  2. Governance counts: in the line `<code>decisions.md</code> — <n> recorded decisions` set `<n>` to the number of lines of `docs/decisions.md` that match `^## \[\d{4}-\d{2}-\d{2}\]`, and in the line `<code>anti-patterns.md</code> — <n> forbidden patterns` set `<n>` to the number of `## ` entry headings of `docs/anti-patterns.md` outside HTML comments. Count them; do not copy a number (the page says 104 and the decisions file has grown since).
  3. Manual-QA runner section: replace the anchor `The phase 8 dogfood closed on an amended success signal.</dd>` with itself followed by this row on a new line (eight spaces of indent):

```html
        <dt>Grounding and vocabulary v2</dt><dd>Since 0.46.0: <code>ground</code> reads the settled page, keeps paragraph, list-item and cell text, and can replay a short prefix of the case&rsquo;s own steps first; session values are registered by source above a length and entropy floor; every run directory ignores its grounding snapshots and evidence, and proves it; each plan entry carries a class and a declining entry a catalogued reason code; the vocabulary gains a session-less request, <code>expect_value</code>, <code>expect_not_visible</code>, <code>expect_state</code> and <code>expect_requests</code>; and a minted role is re-minted once after a probe halt. Phases 1&ndash;7 of <code>qa-runner-grounding-vocabulary-v2.prd.md</code> shipped; phase 8, the dogfood on the same two byte-identical reports, is pending, so the amended metrics are not yet measured.</dd>
```

  4. `Recorded` callout: replace the anchor `and <code>test-auth-minted-session.prd.md</code> (4 phases, all complete).</p>` with `and <code>test-auth-minted-session.prd.md</code> (4 phases, all complete) and <code>qa-runner-grounding-vocabulary-v2.prd.md</code> (8 phases; phases 1&ndash;7 shipped in 0.46.0, the dogfood pending).</p>`.
- **MIRROR**: `# SOURCE: documentation/roadmap/status.html:235-241` (the row's five cells and the `badge--partial` variant).
- **VALIDATE**:

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
node -e '
const fs = require("node:fs");
const t = fs.readFileSync("documentation/roadmap/status.html", "utf8");
const bad = [];
const once = (s) => { const n = t.split(s).length - 1; if (n !== 1) bad.push(`expected exactly once (${n}): ${s}`); };
once("<code>qa-runner-grounding-vocabulary-v2</code></td>");
once("<dt>Grounding and vocabulary v2</dt>");
once("(8 phases; phases 1&ndash;7 shipped in 0.46.0, the dogfood pending).</p>");
const row = /<td><code>qa-runner-grounding-vocabulary-v2<\/code><\/td>\s*<td>8<\/td>\s*<td><span class="badge badge--partial">[^<]*<\/span><\/td>\s*<td>0\.46\.0<\/td>/.exec(t);
if (!row) bad.push("the feature PRD row does not carry 8 phases, a badge--partial status and 0.46.0");
const dec = fs.readFileSync("docs/decisions.md", "utf8").split("\n").filter((l) => /^## \[\d{4}-\d{2}-\d{2}\]/.test(l)).length;
const anti = fs.readFileSync("docs/anti-patterns.md", "utf8").replace(/<!--[\s\S]*?-->/g, "").split("\n").filter((l) => /^## \S/.test(l)).length;
const dm = /<code>decisions\.md<\/code> [^0-9]*(\d+) recorded decisions/.exec(t), am = /<code>anti-patterns\.md<\/code> [^0-9]*(\d+) forbidden patterns/.exec(t);
if (!dm || Number(dm[1]) !== dec) bad.push(`the decision count is ${dm && dm[1]}, docs/decisions.md has ${dec}`);
if (!am || Number(am[1]) !== anti) bad.push(`the anti-pattern count is ${am && am[1]}, docs/anti-patterns.md has ${anti}`);
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
console.log(`PASS: status.html carries the new PRD row and counts ${dec} decisions and ${anti} anti-patterns`);
'
```

### Task 7: UPDATE docs/api-reference.md

- **ACTION**: Delivers AC-A3, AC-A4, AC-A5, AC-A6, AC-A7. This file is outside the `docs-updater` write scope (`docs-update.md` DQ1), so the Implementer owns it in this phase and the implement-time docs-sync pass does not touch it. Use `Edit` with the unique anchors below; never `Write` the file; do not add the string `23 commands` (it must stay exactly twice), `22 commands`, `21 commands`, `19 commands` or `18 commands`, and write no backticked `scripts/...` path that does not exist from the repository root.
  1. `/relay-auth-scripts` row: after the anchor `rather than reimplementing them.` that is directly followed by `Writes no credential value and creates no session; the operator runs each generated script at their own terminal.` insert: ` A run selects the roles of the approved model's matrix, narrowed by `--role`; `--refresh` regenerates only the scripts of those roles that already exist, a selected role with no script is generated as without `--refresh` and is not reported as refreshed, and a role the kit holds that the matrix does not list is not selected and its script is left as it is.`
  2. `/relay-qa-run` row: replace the anchor `registers IndexedDB record keys and values as secrets beside cookie, localStorage and token values, and reports the login halts` when it is followed by `` `FAILED_MINT_UNCONFIRMED`, `FAILED_MINT_COMMAND_MISSING`, `FAILED_NON_LOCAL_TARGET`, `FAILED_MINT_COMMAND` and `FAILED_MINT_OUTPUT` as named `blocked` reasons. A browser case for a role whose `authenticatesAnonymous` `` with `registers session values for redaction source-first (see below), and reports the login halts` (keep the rest of the sentence). Then, immediately after `Reusing a session needs no login and no visible browser.` (the block below begins with a space, and the original space before `Calls `auth-local-guard.mjs` and the kit login scripts` stays after the inserted text), insert:

```
 Every plan entry carries a `class` (`automatable`, `needs-a-new-driver`, `human-by-nature` or `blocked-by-product`), and an entry that declines its case carries a `reason_code` from a closed catalogue (`UNGROUNDABLE_AFTER_INTERACTION`, `EXTERNAL_CHANNEL`, `VISUAL_JUDGEMENT`, `VOCABULARY_GAP`, `STEP_UNGROUNDED`, `PRODUCT_DEFECT`, `STATE_UNCONFIRMED`; `PARTIAL_REMAINDER` is derived by the runner) and no steps; a code or class outside the sets is `PLAN_ENTRY_INVALID`, a case the plan omits is `NO_PLAN_ENTRY` (a planner defect, reported `unclassified`), an executable entry may declare `objective_steps` (0 to 500), and `results.json` carries a `classification` block beside the unchanged four-key `counts`. The `ground` mode writes its snapshot only once two successive snapshots are equal (`GROUND_UNSTABLE`, exit 1 and nothing written otherwise), lists the text of paragraph, list-item and cell lines, and with `--prefix '<json>'` first replays at most 5 flat `goto`, `click` and `fill` steps of the case (`GROUND_PREFIX_INVALID` exits 2, `GROUND_PREFIX_FAILED` exits 1) and writes a separate `--after-<8 hex>` snapshot, so an element that exists only after an interaction is groundable; a case that still needs one is declined `UNGROUNDABLE_AFTER_INTERACTION`. The browser vocabulary also has `expect_value` (`equals`, `contains` or `not_empty`; the value is never written), `expect_not_visible` (valid only after a positive step on the same route since the last `goto`), `expect_state` (`expanded`, `disabled` or `checked`) and `expect_requests` (`method`, `url_contains` and a `count` from 0 to 100, counted from the last `goto`, `click` or `fill` until 2 seconds after the step starts; method, host and path only in `evidence/case-<index>.requests-<step>.json`, at most 50 listed), and an `http` `request` step may carry `"session": "none"` to be sent with no cookie, no storage state and no derived header through the same local-only guard, which needs no role even for a header-bearing origin. Session values are registered source-first (the token artifact, the declared `sessionCookie` and every `api_origins` cookie always; any other cookie, `localStorage` or IndexedDB string only at 12 characters and 3.0 bits per character, and never a part of the target origin), and every new run directory carries a `.gitignore` for `grounding/` and `evidence/`, proven with `git check-ignore` (`IGNORE_PROOF: proven` or `not-applicable`; `FAILED_IGNORE_UNPROVEN` otherwise). A minted role whose login script halts `FAILED_PROBE_MARKER_ABSENT` right after it minted is run once more with `--force`, at most once per role per run, and a second halt blocks the role with that halt's code. The numbers are chosen, not measured.
```

  3. `qa-run.mjs` row: (a) replace `` `init` (guard, then a fresh run directory) `` with `` `init` (guard, then a fresh run directory with its own `.gitignore` for `grounding/` and `evidence/`, proved with `git check-ignore`: `IGNORE_PROOF: proven` or `not-applicable`, else `FAILED_IGNORE_UNPROVEN`) ``; (b) replace `` `--root --feature --run-dir --route [--role] [--env-handle]` `` with `` `--root --feature --run-dir --route [--role] [--env-handle] [--prefix]` ``; (c) replace `` named halts include `GROUND_SNAPSHOT_UNAVAILABLE`, `FAILED_PLAYWRIGHT_UNAVAILABLE`, `SESSION_UNAVAILABLE`, `TARGET_UNREACHABLE`) `` with `` the file is written only once two successive snapshots, 1 second apart, are equal within 20 seconds (`GROUND_POLL_INTERVAL_MS`, `GROUND_STABLE_BOUND_MS`); with `--prefix` it first replays at most 5 flat `goto`, `click` and `fill` steps and writes `<run-dir>/grounding/<role>--<route>--after-<8 hex>.snapshot.json` (`schema_version` 2, each typed value only as a SHA-256 digest); named halts include `GROUND_UNSTABLE`, `GROUND_PREFIX_FAILED`, `FAILED_IGNORE_UNPROVEN`, `GROUND_SNAPSHOT_UNAVAILABLE`, `FAILED_PLAYWRIGHT_UNAVAILABLE`, `SESSION_UNAVAILABLE` and `TARGET_UNREACHABLE`, and a malformed prefix exits 2 with `GROUND_PREFIX_INVALID`) ``; (d) replace the registration clause of this row, anchored by its tail `` as named `blocked` reasons. A browser case for a role carrying `authenticatesAnonymous` ``, so that `registers IndexedDB record keys and values as secrets beside cookie, localStorage and token values, and reports the login halts` becomes `registers session values source-first (`SESSION_VALUE_MIN_LENGTH` 12, `SESSION_VALUE_MIN_ENTROPY` 3.0, `splitSessionValues`, `isRegistrableSessionValue`), and reports the login halts`; (e) immediately after the string `is registered for redaction before any request.` (it occurs once in the file; the block below begins with a space, and the original space before the sentence ``Exit `0` completed, `1` a named halt or an aborted run, `2` bad arguments. Contract enforced by the `qa-run-contract` check.`` stays after the inserted text, so single spaces remain on both sides) insert:

```
 The closed sets and the numbers are exported and pinned by the contract check: `REASON_CATALOGUE`, `RUNNER_OWNED_REASON_CODES`, `CASE_CLASSES` and `CLASS_UNCLASSIFIED` (with `validatePlanClassification`, `summarizeClassification`, `applyClassification`, `declinedCase`, `classOf` and `objectiveStepsOf`); `GROUND_POLL_INTERVAL_MS`, `GROUND_STABLE_BOUND_MS` and `waitForStableSnapshot`; `GROUND_PREFIX_MAX_STEPS`, `GROUND_PREFIX_VALUE_MAX`, `GROUND_PREFIX_ACTIONS`, `parseGroundPrefix`, `groundingStepKey`, `groundingPrefixKey`, `interactionHistory`, `isPostInteractionSnapshot`, `groundSnapshotFileName`, `finalPageRoute`, `replayGroundingPrefix` and `withheldPrefixStep`; `SESSION_VALUE_MIN_LENGTH`, `SESSION_VALUE_MIN_ENTROPY`, `shannonEntropy`, `isRegistrableSessionValue`, `splitSessionValues`, `declaredCookieNamesOf`, `RUN_IGNORE_RULES`, `RUN_IGNORE_PROBES`, `proveRunIgnored` and `ensureRunIgnore`; `POSITIVE_ASSERTION_ACTIONS`, `EXPECT_STATES`, `ASSERT_SETTLE_MS`, `ASSERT_POLL_INTERVAL_MS`, `settleAssertion`, `comparisonKindOf`, `compareInputValue`, `ariaExpandedOf` and `httpContextOptions`; `EXPECT_REQUESTS_SETTLE_MS`, `EXPECT_REQUESTS_COUNT_MAX`, `EXPECT_REQUESTS_EVIDENCE_MAX`, `classifyObservedRequest`, `evaluateRequestWindow`, `settleRequestWindow` and `observeRequests`; `LOGIN_REMINT_MAX_RETRIES` with `shouldRemintLogin`; and the `USAGE` text, which lists the four modes and the `ground` flags. Every number is chosen, not measured, and the dogfood recalibrates it.
```
- **MIRROR**: `# SOURCE: docs/domain/glossary.md:535-547` (the floor stated by source); the exports list is the set difference of the runner's exports against the pre-feature commit, so it is complete by construction.
- **VALIDATE**:

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
node --input-type=module -e '
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
const BASE = "e7a40810f50004d46c5caaa6edaf6c0aec691dc3";
const m = await import(pathToFileURL(path.resolve("plugins/relay/scripts/qa-run.mjs")).href);
const api = fs.readFileSync("docs/api-reference.md", "utf8");
const bad = [];
const baseSrc = execFileSync("git", ["show", `${BASE}:plugins/relay/scripts/qa-run.mjs`], { encoding: "utf8", maxBuffer: 1 << 26 });
const baseNames = new Set([...baseSrc.matchAll(/^export (?:async function|function|const) ([A-Za-z0-9_]+)/gm)].map((x) => x[1]));
const fresh = Object.keys(m).filter((k) => !baseNames.has(k));
if (fresh.length < 40) bad.push(`only ${fresh.length} new exports were found against the base: the derivation is broken`);
for (const k of fresh) if (!api.includes("`" + k + "`")) bad.push("docs/api-reference.md does not name the new export " + k);
for (const k of Object.keys(m.REASON_CATALOGUE)) if (!api.includes("`" + k + "`")) bad.push("catalogue code not named: " + k);
for (const s of ["GROUND_UNSTABLE", "GROUND_PREFIX_INVALID", "GROUND_PREFIX_FAILED", "FAILED_IGNORE_UNPROVEN", "--prefix", "IGNORE_PROOF: proven", "expect_requests", "expect_value", "expect_not_visible", "expect_state", "is not reported as refreshed", "registers session values source-first"]) if (!api.includes(s)) bad.push("lacks: " + s);
if (!/"session": "none"/.test(api)) bad.push("the session-less step is not documented");
if (api.includes("registers IndexedDB record keys and values as secrets beside cookie")) bad.push("a stale registration clause is still present");
if (api.split("23 commands").length - 1 !== 2) bad.push("23 commands must appear exactly twice");
for (const s of ["22 commands", "21 commands", "19 commands", "18 commands"]) if (api.includes(s)) bad.push("a pinned-absent count appeared: " + s);
for (const k of ["FAILED_MINT_UNCONFIRMED", "FAILED_MINT_COMMAND_MISSING", "FAILED_MINT_COMMAND", "FAILED_MINT_OUTPUT"]) if (!api.includes(k)) bad.push("pinned halt name removed: " + k);
if (!/240/.test(api)) bad.push("the 240-second margin was removed");
const addedApi = execFileSync("git", ["diff", "--unified=0", BASE, "--", "docs/api-reference.md"], { encoding: "utf8", maxBuffer: 1 << 26 }).split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++"));
if (addedApi.some((l) => l.includes("`scripts/"))) bad.push("a backticked scripts/ path was added (path-existence resolves it from the repository root)");
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
console.log(`PASS: docs/api-reference.md names all ${fresh.length} new exports and the 0.46.0 behavior`);
'
npm run validate 2>&1 | tail -n 3 | grep -qF "28 passed, 0 failed (28 checks run)"
echo "PASS: path-existence and the other checks still pass"
```

### Task 8: UPDATE documentation/assets/data/search-index.json

- **ACTION**: Delivers AC-A9. Three excerpt edits; no entry is added (no page is added) and no key other than `excerpt` changes. Keep each excerpt on its one physical line.
  1. The `Commands` entry (`path` `reference/commands.html`): replace the anchor `and writes results.json under PRPs/reports/<feature>/qa-run/."` with `and writes results.json under PRPs/reports/<feature>/qa-run/. Since 0.46.0 /relay-qa-run grounds against the settled page, classifies every case and names why one was not executed, registers session values by source above a floor, keeps run evidence out of git with a proven ignore, and adds a session-less request, input-value, absence and state assertions, a grounding prefix and a request count."`. The excerpt must still begin with `Twenty-three commands`.
  2. The `Scripts` entry (`reference/scripts.html`): replace the anchor `usage-metrics and executable-content-hash."` with `usage-metrics and executable-content-hash. qa-run grounds against the settled page, classifies every case, registers session values by source above a floor and proves its run-evidence ignore."`.
  3. The `Redaction policy` entry (`reference/redaction-policy.html`): replace the anchor `documented non-redacted values."` with `documented non-redacted values. Also the QA runner evidence rules: source-first session-value registration above a floor, the run-directory ignore, and snapshots, screenshots and personal data."`.
  Write no `/relay-` string that is not a command file (`registration-parity` flags a stale mention); `/relay-qa-run` is one.
- **MIRROR**: `# SOURCE: documentation/assets/data/search-index.json:110-113` is the head of the Commands entry whose `excerpt` (the next, very long line, 114) this edit extends; read that line before editing and keep each excerpt on its one physical line.
- **VALIDATE**:

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
node -e '
const fs = require("node:fs");
const idx = JSON.parse(fs.readFileSync("documentation/assets/data/search-index.json", "utf8"));
const bad = [];
const by = (p) => idx.find((e) => e.path === p);
const need = (p, s) => { const e = by(p); if (!e) bad.push("no entry for " + p); else if (!e.excerpt.includes(s)) bad.push(p + " excerpt lacks: " + s); };
need("reference/commands.html", "Since 0.46.0 /relay-qa-run grounds against the settled page, classifies every case");
need("reference/scripts.html", "qa-run grounds against the settled page, classifies every case");
need("reference/redaction-policy.html", "Also the QA runner evidence rules: source-first session-value registration above a floor");
const c = by("reference/commands.html");
if (c && (!/^Twenty-three commands/.test(c.excerpt) || /Twenty-two|Twenty-one|Nineteen|Fifteen commands/.test(c.excerpt))) bad.push("the Commands excerpt lost its pinned count wording");
const commands = new Set(fs.readdirSync("plugins/relay/commands").filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, "")));
for (const e of idx) for (const mm of e.excerpt.matchAll(/(?<![\w\/])\/(relay-[a-z0-9-]+)/g)) if (!commands.has(mm[1])) bad.push("stale command mention in " + e.path + ": /" + mm[1]);
const baseIdx = JSON.parse(require("node:child_process").execFileSync("git", ["show", "e7a40810f50004d46c5caaa6edaf6c0aec691dc3:documentation/assets/data/search-index.json"], { encoding: "utf8", maxBuffer: 1 << 26 }));
if (idx.length !== baseIdx.length) bad.push(`the index entry count changed from ${baseIdx.length} to ${idx.length}; this phase adds no page`);
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
console.log("PASS: search-index.json carries the 0.46.0 excerpts and stays valid");
'
npm run validate 2>&1 | tail -n 3 | grep -qF "28 passed, 0 failed (28 checks run)"
echo "PASS: registration-parity and the other checks still pass"
```

### Task 9: UPDATE the release cut (plugin.json, changelog.html, README.md)

- **ACTION**: Delivers AC-A1 and AC-A2, carries the changelog statements of AC-A3 to AC-A7 (the `Added` list names each capability) and the unique ids and resolving links of AC-A9. Do this task last of the edits, so the entry can describe what was done. Three files, one change; the intermediate state between the first and second edit is red by design.
  1. `plugins/relay/.claude-plugin/plugin.json`: replace `"version": "0.45.0",` with `"version": "0.46.0",`. This is the minor bump of the pre-feature manifest; read the live value first and bump its minor, resetting the patch to 0.
  2. `README.md`: replace `` `plugins/relay` (version 0.45.0, per its `plugin.json`) contains 23 `` with the same text carrying `0.46.0`. Nothing else in the file changes (the command and agent counts and the 28-check count are unchanged).
  3. `documentation/changelog.html`, two `Edit` calls that leave every existing byte of the three `Unreleased` entries untouched:
     a. Replace the single line `      <h3 id="unreleased-changed">Changed</h3>` with the block below. `<DATE>` is the UTC date on which you perform this task, `YYYY-MM-DD` from `date -u +%F`; it must not precede 2026-10-09. The existing `<ul>` with the three entries then follows the new `Changed` heading unchanged.

```html
      <p>Nothing yet.</p>

      <h2 id="v0-46-0">0.46.0 &#8212; <DATE></h2>

      <p>Grounding and vocabulary v2. The 0.44.0 and 0.45.0 re-runs drove 1 of 14 reachable cases across
        <code>super-ensino</code> and <code>praesto-sum</code> although authentication was solved. The runner read a
        single-page application before it rendered, dropped paragraph, list-item and cell text, registered harmless
        session values such as <code>localhost</code> as secrets, hid why a case was not executed, and left the
        owner&rsquo;s personal data in a directory git does not ignore. This release ships phases 1&ndash;6 of
        <code>PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md</code> and its release cut. Phase 8, the dogfood on the
        same two byte-identical reports, follows on this release. The four-outcome vocabulary, the local-only guard,
        the review loop, <code>/relay-qa-report</code> and <code>capture.mjs</code> are unchanged, and so are the login
        template and its <code>KIT_TEMPLATE_ID</code>, so a kit generated by 0.45.0 needs no
        <code>/relay-auth-scripts --refresh</code>.</p>

      <h3 id="v0-46-0-added">Added</h3>

      <ul>
        <li><strong>Reason-code catalogue and pre-run classification</strong> &mdash; every plan entry of
          <code>/relay-qa-run</code> carries a <code>class</code> (<code>automatable</code>,
          <code>needs-a-new-driver</code>, <code>human-by-nature</code> or <code>blocked-by-product</code>), and an
          entry that declines a case carries a <code>reason_code</code> from a closed catalogue instead of steps. A
          code or class outside the sets is <code>PLAN_ENTRY_INVALID</code>. <code>results.json</code> gains a
          <code>classification</code> block with per-class counts, the driver-executed rate over the automatable class
          and objective-step coverage; the four-key <code>counts</code> partition is unchanged and a partially
          executed case never counts in the rate. A case the plan omits is <code>NO_PLAN_ENTRY</code>, a planner
          defect.</li>
        <li><strong>Stable grounding and text candidates</strong> &mdash; <code>qa-run.mjs ground</code> writes its
          snapshot only once two successive accessibility snapshots, 1 second apart, are equal within 20 seconds; a
          page that never settles ends <code>GROUND_UNSTABLE</code> with no file. Paragraph, list-item and cell lines
          now yield text candidates. The command documents <code>MSYS_NO_PATHCONV=1</code> for a leading-slash
          <code>--route</code> under Windows Git Bash.</li>
        <li><strong>Redaction precision and run-evidence privacy</strong> &mdash; session values are registered by
          source: the token artifact, the declared <code>sessionCookie</code> and the <code>api_origins</code> cookies
          always, any other value only at 12 characters and 3.0 bits per character and never a part of the target
          origin, so <code>localhost</code> or <code>false</code> no longer corrupts a URL. Every run directory
          carries a <code>.gitignore</code> for <code>grounding/</code> and <code>evidence/</code>, proved with
          <code>git check-ignore</code> (<code>IGNORE_PROOF</code>), and an unproven rule halts
          <code>FAILED_IGNORE_UNPROVEN</code> before anything is written. The redaction policy gains a section on
          session values, snapshots, screenshots and personal data.</li>
        <li><strong>A request without the session, an input value, absence and state</strong> &mdash;
          <code>"session": "none"</code> sends an <code>http</code> <code>request</code> step with no cookie, no
          storage state and no derived header; <code>expect_value</code> compares an input without recording its
          value; <code>expect_not_visible</code> is valid only after a positive step on the same route;
          <code>expect_state</code> asserts <code>expanded</code>, <code>disabled</code> or
          <code>checked</code>.</li>
        <li><strong>Grounding after an interaction</strong> &mdash; <code>ground --prefix</code> replays at most 5
          <code>goto</code>, <code>click</code> and <code>fill</code> steps of the case, through the local-only guard,
          before it snapshots, so an element that exists only after an interaction can be grounded. A typed value is
          recorded only as a SHA-256 digest; the entries of the snapshot are page text and can echo it, so the file
          lives in the ignored <code>grounding/</code> directory.</li>
        <li><strong>Request count, bounded re-mint and refresh role set</strong> &mdash;
          <code>expect_requests</code> counts the requests a page issues from the last interaction until 2 seconds
          after the step starts and records method, host and path only. A minted role whose login script halts
          <code>FAILED_PROBE_MARKER_ABSENT</code> right after it minted is run once more by the runner with
          <code>--force</code>, at most once per role per run. <code>/relay-auth-scripts</code> states that
          <code>--refresh</code> covers the roles of the approved model matrix, narrowed by <code>--role</code>.</li>
        <li><strong>Validation suite</strong> &mdash; <code>qa-run-contract</code> and <code>auth-secrecy</code> gained
          opt-in rule sets for the catalogue, stable grounding, run-evidence privacy, the new steps, the grounding
          prefix and the request count. The check count stays 28.</li>
      </ul>

      <h3 id="v0-46-0-changed">Changed</h3>
```

     b. Replace the single line `          upstream repository&rdquo; section under What&rsquo;s next, as registered and not scheduled.</li>` (the last line of the third existing entry) with itself followed by these entries, before the existing `</ul>`:

```html
        <li><strong><code>reference/commands.html</code>, <code>reference/scripts.html</code></strong> &mdash; the
          <code>/relay-qa-run</code> and <code>qa-run.mjs</code> entries describe the classification, stable grounding,
          the grounding prefix, the redaction floor, the run-evidence ignore, the new steps, the request count and the
          re-mint, state which numbers are chosen rather than measured, and drop the claim that every IndexedDB string
          is registered as a secret. The <code>/relay-auth-scripts</code> entry states which roles
          <code>--refresh</code> covers.</li>
        <li><strong><code>reference/redaction-policy.html</code></strong> &mdash; a new section mirrors the QA runner
          evidence rules of the packaged policy, and the page subtitle names it.</li>
        <li><strong><code>reference/validation-checks.html</code>, <code>guide/validation-suite.html</code></strong>
          &mdash; the <code>qa-run-contract</code> and <code>auth-secrecy</code> entries list the rule sets added since
          0.44.0 and carry real test counts in place of &ldquo;none yet&rdquo;.</li>
        <li><strong><code>roadmap/status.html</code></strong> &mdash; a row for
          <code>qa-runner-grounding-vocabulary-v2</code> in the feature PRD table (8 phases, 0.46.0, dogfood pending)
          and a &ldquo;Grounding and vocabulary v2&rdquo; row in the manual-QA runner section; the decision and
          anti-pattern counts are re-derived from <code>docs/decisions.md</code> and
          <code>docs/anti-patterns.md</code>.</li>
        <li><strong><code>README.md</code> and <code>docs/api-reference.md</code></strong> &mdash; the README names
          the released version, and the API reference rows for <code>/relay-auth-scripts</code>,
          <code>/relay-qa-run</code> and <code>qa-run.mjs</code> describe the classification, grounding, redaction and
          vocabulary changes and list the new exports.</li>
        <li><strong><code>plugins/relay/.claude-plugin/plugin.json</code></strong>
          &mdash; version bumped <code>0.45.0</code> &rarr; <code>0.46.0</code> to
          match this release; users running <code>/plugin</code> after pulling
          this version will get a fresh <code>relay/0.46.0/</code> cache directory
          with the grounding, redaction and vocabulary changes of <code>/relay-qa-run</code> registered. The login
          template and its stamp are unchanged, so scripts generated by 0.45.0 stay current.</li>
```
- **MIRROR**: `# SOURCE: documentation/changelog.html:31-36` (the block cut); `# SOURCE: documentation/changelog.html:121-130` (the release block shape); `# SOURCE: documentation/changelog.html:171-175` (the manifest-bump line); `# SOURCE: scripts/validate/checks/version-parity.mjs:46-56` (the heading the check reads); `# SOURCE: README.md:16`.
- **VALIDATE**:

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
node --input-type=module -e '
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const BASE = "e7a40810f50004d46c5caaa6edaf6c0aec691dc3";
const read = (f) => fs.readFileSync(f, "utf8");
const git = (...a) => execFileSync("git", a, { encoding: "utf8", maxBuffer: 1 << 26 });
const flat = (s) => s.replace(/\s+/g, " ");
const bad = [];
const pj = JSON.parse(read("plugins/relay/.claude-plugin/plugin.json"));
const bj = JSON.parse(git("show", `${BASE}:plugins/relay/.claude-plugin/plugin.json`));
const [bMaj, bMin] = bj.version.split(".").map(Number);
const [nMaj, nMin, nPat] = String(pj.version).split(".").map(Number);
if (!(nMaj === bMaj && nMin === bMin + 1 && nPat === 0)) bad.push(`plugin.json ${pj.version} is not the minor bump of ${bj.version}`);
const V = pj.version, ID = "v" + V.replaceAll(".", "-");
const log = read("documentation/changelog.html");
const heads = [...log.matchAll(/<h2\s+id="([^"]*)"[^>]*>([^<]*)<\/h2>/g)];
const first = heads.find((h) => h[1] !== "unreleased" && /^\d+\.\d+\.\d+/.test(h[2].trim()));
if (!first || first[1] !== ID || !first[2].trim().startsWith(V + " ")) bad.push(`the first released changelog heading is not ${ID} / ${V}`);
const date = first ? (/(\d{4}-\d{2}-\d{2})$/.exec(first[2].trim()) || [])[1] : undefined;
const today = new Date().toISOString().slice(0, 10);
if (!date || date < "2026-10-09" || date > today) bad.push(`the release date ${date} is not between 2026-10-09 and ${today}`);
const un = log.indexOf(`<h2 id="unreleased">Unreleased</h2>`), rs = log.indexOf(`<h2 id="${ID}">`), ps = log.indexOf(`<h2 id="v0-45-0">`);
if (log.split(`<h2 id="unreleased">`).length !== 2) bad.push("exactly one Unreleased heading is required");
if (!(un >= 0 && un < rs && rs < ps)) bad.push(`the order must be Unreleased, ${ID}, v0-45-0`);
const unBody = log.slice(un, rs);
if (!unBody.includes("<p>Nothing yet.</p>") || unBody.includes("<li>")) bad.push("the Unreleased block must hold only a Nothing yet paragraph");
const block = flat(log.slice(rs, ps));
for (const s of [`<h3 id="${ID}-added">Added</h3>`, `<h3 id="${ID}-changed">Changed</h3>`, "<code>plugins/relay/.claude-plugin/plugin.json</code>", `<code>${bj.version}</code> &rarr; <code>${V}</code>`, `relay/${V}/`]) if (!block.includes(s)) bad.push("the release block lacks: " + s);
for (const s of ["<strong>Reason-code catalogue and pre-run classification</strong>", "<strong>Stable grounding and text candidates</strong>", "<strong>Redaction precision and run-evidence privacy</strong>", "<strong>A request without the session, an input value, absence and state</strong>", "<strong>Grounding after an interaction</strong>", "<strong>Request count, bounded re-mint and refresh role set</strong>", "<strong>Validation suite</strong>"]) if (!block.includes(s)) bad.push("the Added list lacks: " + s);
const baseLog = git("show", `${BASE}:documentation/changelog.html`);
const baseUn = baseLog.slice(baseLog.indexOf(`<h2 id="unreleased">`), baseLog.indexOf(`<h2 id="v0-45-0">`));
const items = [...baseUn.matchAll(/<li>[\s\S]*?<\/li>/g)].map((x) => flat(x[0]));
if (items.length !== 3) bad.push(`expected 3 carried-over entries at the base, found ${items.length}`);
for (const it of items) if (!block.includes(it)) bad.push("a carried-over entry is not in the release block: " + it.slice(0, 70));
if (log.split("Kit authoring for the <code>minted</code> mechanism").length !== 2) bad.push("the 0.45.0 marker entry must stay exactly once");
if (!log.includes("FAILED_MINT_OUTPUT") || !/IndexedDB/.test(log)) bad.push("a pinned changelog token was removed");
if (!read("README.md").includes(`(version ${V}, per its \`plugin.json\`)`)) bad.push(`README.md does not state version ${V}`);
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
console.log(`PASS: the ${V} cut is coherent across the manifest, the changelog and the README`);
'
npm run validate 2>&1 | tail -n 3 | grep -qF "28 passed, 0 failed (28 checks run)"
echo "PASS: version-parity and the other checks pass on the cut"
```

### Task 10: VERIFY the release-ready tree (no edit)

- **ACTION**: Delivers AC-A10, AC-A11. Edit nothing in this task. Run `## Validation Commands` Levels 1, 2 and 3 in full on the finished tree. If a level is red, fix the documentation edit that caused it (never a test, never a check, never a plugin file). If a corpus test fails on an assertion about a page or the changelog, do not edit it: write down the test file, the test name and the line, and stop; the test pair updates it as `EXISTING_TEST_UPDATED` and Level 3 is then re-run excluding exactly those tests with `--test-skip-pattern` (never `--test-name-pattern`). The inventory behind this plan found no such test.
- **MIRROR**: `# SOURCE: scripts/validate/checks/version-parity.mjs:46-56` (the one check the cut can turn red) and the Level 1 to 3 commands below.
- **VALIDATE**:

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
BASE=e7a40810f50004d46c5caaa6edaf6c0aec691dc3
FROZEN="plugins/relay/agents/code-reviewer.md plugins/relay/agents/code-reviewer-semantic.md plugins/relay/commands/relay-implement.md plugins/relay/commands/relay-qa-report.md plugins/relay/scripts/visual/capture.mjs plugins/relay/resources/auth-login.template.mjs"
# shellcheck disable=SC2086
git diff --quiet "$BASE" -- $FROZEN || { echo "FAIL: a frozen surface or the kit login template differs from the pre-feature content"; git diff --stat "$BASE" -- $FROZEN; exit 1; }
echo "PASS: the frozen surfaces and the kit login template are byte-identical to the pre-feature content"
out="$(npm run validate 2>&1)" || { printf '%s\n' "$out" | tail -n 40; echo "FAIL: npm run validate exited non-zero"; exit 1; }
printf '%s\n' "$out" | tail -n 3 | grep -qF "28 passed, 0 failed (28 checks run)"
echo "PASS: 28 of 28 checks"
```

## Validation Commands

Every command exits non-zero when its invariant fails (`set -euo pipefail`, an explicit `process.exit(1)`, or the tool's own status). Run them from the worktree root. The page-content checks read the runner's own exports, so no number is written twice.

### Level 1 STATIC_ANALYSIS

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
BASE=e7a40810f50004d46c5caaa6edaf6c0aec691dc3
node -e '
const fs = require("node:fs");
for (const f of ["plugins/relay/.claude-plugin/plugin.json", "documentation/assets/data/search-index.json"]) {
  try { JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { console.error("FAIL: " + f + " is not valid JSON: " + e.message); process.exit(1); }
}
console.log("PASS: both JSON files parse");
'
git diff --check "$BASE" -- documentation README.md docs/api-reference.md plugins/relay/.claude-plugin/plugin.json
echo "PASS: no whitespace error and no CR in the added lines"
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
const BASE = "e7a40810f50004d46c5caaa6edaf6c0aec691dc3";
const P6 = "896498d969724e4c3e65588eaea7c6af93b49771";
const bad = [];
const read = (f) => fs.readFileSync(f, "utf8");
const git = (...a) => execFileSync("git", a, { encoding: "utf8", maxBuffer: 1 << 28 });
const same = (rev, ...files) => { try { execFileSync("git", ["diff", "--quiet", rev, "--", ...files]); return true; } catch { return false; } };
const flat = (s) => s.replace(/\s+/g, " ");
const pj = JSON.parse(read("plugins/relay/.claude-plugin/plugin.json"));
const bj = JSON.parse(git("show", `${BASE}:plugins/relay/.claude-plugin/plugin.json`));
const [bMaj, bMin] = bj.version.split(".").map(Number);
const [nMaj, nMin, nPat] = String(pj.version).split(".").map(Number);
if (!(nMaj === bMaj && nMin === bMin + 1 && nPat === 0)) bad.push(`plugin.json ${pj.version} is not the minor bump of ${bj.version}`);
const V = pj.version, ID = "v" + V.replaceAll(".", "-");
const log = read("documentation/changelog.html");
const heads = [...log.matchAll(/<h2\s+id="([^"]*)"[^>]*>([^<]*)<\/h2>/g)];
const first = heads.find((h) => h[1] !== "unreleased" && /^\d+\.\d+\.\d+/.test(h[2].trim()));
if (!first || first[1] !== ID || !first[2].trim().startsWith(V + " ")) bad.push(`the first released changelog heading is not ${ID} / ${V}`);
const date = first ? (/(\d{4}-\d{2}-\d{2})$/.exec(first[2].trim()) || [])[1] : undefined;
const today = new Date().toISOString().slice(0, 10);
if (!date || date < "2026-10-09" || date > today) bad.push(`the release date ${date} is not between 2026-10-09 and ${today}`);
const un = log.indexOf(`<h2 id="unreleased">Unreleased</h2>`), rs = log.indexOf(`<h2 id="${ID}">`), ps = log.indexOf(`<h2 id="v0-45-0">`);
if (log.split(`<h2 id="unreleased">`).length !== 2 || !(un >= 0 && un < rs && rs < ps)) bad.push("the headings are not one Unreleased above the release above v0-45-0");
if (!log.slice(un, rs).includes("<p>Nothing yet.</p>") || log.slice(un, rs).includes("<li>")) bad.push("the Unreleased block must hold only a Nothing yet paragraph");
const block = flat(log.slice(rs, ps));
for (const s of [`<h3 id="${ID}-added">Added</h3>`, `<h3 id="${ID}-changed">Changed</h3>`, `<code>${bj.version}</code> &rarr; <code>${V}</code>`, `relay/${V}/`, "<strong>Reason-code catalogue and pre-run classification</strong>", "<strong>Stable grounding and text candidates</strong>", "<strong>Redaction precision and run-evidence privacy</strong>", "<strong>A request without the session, an input value, absence and state</strong>", "<strong>Grounding after an interaction</strong>", "<strong>Request count, bounded re-mint and refresh role set</strong>", "<strong>Validation suite</strong>"]) if (!block.includes(s)) bad.push("the release block lacks: " + s);
const baseLog = git("show", `${BASE}:documentation/changelog.html`);
const baseUn = baseLog.slice(baseLog.indexOf(`<h2 id="unreleased">`), baseLog.indexOf(`<h2 id="v0-45-0">`));
for (const x of [...baseUn.matchAll(/<li>[\s\S]*?<\/li>/g)]) if (!block.includes(flat(x[0]))) bad.push("a carried-over Unreleased entry changed or moved: " + flat(x[0]).slice(0, 70));
if (!read("README.md").includes(`(version ${V}, per its \`plugin.json\`)`)) bad.push(`README.md does not state version ${V}`);
const FROZEN = ["plugins/relay/agents/code-reviewer.md", "plugins/relay/agents/code-reviewer-semantic.md", "plugins/relay/commands/relay-implement.md", "plugins/relay/commands/relay-qa-report.md", "plugins/relay/scripts/visual/capture.mjs"];
if (!same(BASE, ...FROZEN)) bad.push("a frozen surface differs from the pre-feature content");
if (!same(BASE, "plugins/relay/resources/auth-login.template.mjs")) bad.push("the kit login template differs from the pre-feature content");
if (!same(BASE, ".claude-plugin/marketplace.json")) bad.push("the marketplace manifest changed");
if (!same(BASE, "docs/decisions.md", "docs/anti-patterns.md", "documentation/governance", "documentation/assets/js", "documentation/assets/css")) bad.push("a governance mirror, the NAV script or the stylesheet changed");
const PLANNED = ["README.md", "plugins/relay/.claude-plugin/plugin.json", "docs/api-reference.md", "documentation/changelog.html", "documentation/reference/commands.html", "documentation/reference/scripts.html", "documentation/reference/redaction-policy.html", "documentation/reference/validation-checks.html", "documentation/guide/validation-suite.html", "documentation/roadmap/status.html", "documentation/assets/data/search-index.json"];
let have = true;
try { execFileSync("git", ["cat-file", "-e", P6]); } catch { have = false; }
if (have) {
  if (!same(P6, ...FROZEN)) bad.push("a frozen surface differs from the phase-6 tree");
  const names = git("diff", "--name-only", P6, "--", ".", ":(exclude)PRPs").split("\n").filter(Boolean);
  for (const n of names) if (!PLANNED.includes(n) && !n.startsWith("docs/domain/") && !n.startsWith("docs/context/")) bad.push("changed outside the plan scope: " + n);
  for (const n of PLANNED) if (!names.includes(n)) bad.push("a planned file was not changed: " + n);
} else {
  console.log("NOTE: the phase-6 tree object is not present, so the phase-delta fence is skipped; the pre-feature checks above still bind");
}
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
console.log(`PASS: the ${V} cut, the frozen surfaces and the scope fence hold`);
'
```

Level 2b: the page content, with every number derived from the runner.

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
node --input-type=module -e '
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
const BASE = "e7a40810f50004d46c5caaa6edaf6c0aec691dc3";
const m = await import(pathToFileURL(path.resolve("plugins/relay/scripts/qa-run.mjs")).href);
const bad = [];
const read = (f) => fs.readFileSync(f, "utf8");
const slice = (t, a, b) => { const i = t.indexOf(a), j = t.indexOf(b, i + 1); return i >= 0 && j > i ? t.slice(i, j) : ""; };
const holds = (label, t, toks) => { for (const s of toks) if (!t.includes(s)) bad.push(`${label} lacks: ${s}`); };
const absent = (label, t, toks) => { for (const s of toks) if (t.includes(s)) bad.push(`${label} must not contain: ${s}`); };
const STALE = "registers IndexedDB record keys and values as secrets beside cookie";
const HALTS = ["GROUND_UNSTABLE", "GROUND_PREFIX_INVALID", "GROUND_PREFIX_FAILED", "FAILED_IGNORE_UNPROVEN", "IGNORE_PROOF: proven", "IGNORE_PROOF: not-applicable"];
const NUM = [`${m.GROUND_POLL_INTERVAL_MS / 1000} second apart, are equal within ${m.GROUND_STABLE_BOUND_MS / 1000} seconds`, `at most ${m.GROUND_PREFIX_MAX_STEPS} flat`, `at least ${m.SESSION_VALUE_MIN_LENGTH} characters long`, `at least ${m.SESSION_VALUE_MIN_ENTROPY.toFixed(1)} bits per character`, `for up to ${m.ASSERT_SETTLE_MS / 1000} seconds`, `from 0 to ${m.EXPECT_REQUESTS_COUNT_MAX}`, `${m.EXPECT_REQUESTS_SETTLE_MS / 1000} seconds after the step starts`, `at most ${m.EXPECT_REQUESTS_EVIDENCE_MAX} are listed`];
if (m.LOGIN_REMINT_MAX_RETRIES !== 1) bad.push("the re-mint cap is no longer 1: reword the pages");
const runner = read("plugins/relay/scripts/qa-run.mjs");
if (!runner.includes("slice(0, 200)") || !runner.includes("url_contains.length > 200")) bad.push("the 200-character caps the pages state are no longer in the runner");
// commands.html
const cmd = read("documentation/reference/commands.html");
const qa = slice(cmd, `<h3 id="relay-qa-run">`, `<h3 id="relay-qa-seed">`);
const au = slice(cmd, `<h3 id="relay-auth-scripts">`, `<h3 id="relay-qa-run">`);
holds("commands.html auth-scripts", au, ["narrowed by <code>--role</code>, and <code>--refresh</code> regenerates only the scripts of those roles that already exist", "is not reported as refreshed", "its script is left as it is"]);
holds("commands.html qa-run", qa, [...HALTS, ...NUM, "registers session values for redaction source-first (see Redaction and run evidence below)", "MSYS_NO_PATHCONV=1", "paragraph, list-item and cell lines", "an e-mail address included", "applies to snapshot entries only", "chosen, not measured", "at most once per role per run", "with the code of that halt", "SHA-256 digest", "can echo a value the page renders back", "FAILED_NON_LOCAL_TARGET", "evidence/case-&lt;index&gt;.requests-&lt;step&gt;.json", "FAILED_PROBE_MARKER_ABSENT"]);
for (const k of Object.keys(m.REASON_CATALOGUE)) holds("commands.html qa-run", qa, [`<code>${k}</code>`]);
for (const k of m.CASE_CLASSES) holds("commands.html qa-run", qa, [`<code>${k}</code>`]);
absent("commands.html", cmd, [STALE]);
holds("commands.html", cmd, ["Twenty-three commands", "240 seconds", "FAILED_MINT_UNCONFIRMED", "FAILED_MINT_COMMAND_MISSING", "FAILED_MINT_OUTPUT"]);
// scripts.html
const scr = read("documentation/reference/scripts.html");
const run = slice(scr, `<h2 id="qa-run">`, `<h2 id="qa-seed">`);
holds("scripts.html qa-run", run, [...HALTS, "[--prefix &lt;json&gt;]", "registers session values for redaction source-first (see Redaction floor and run evidence below)", "paragraph, list-item and cell lines", "a malformed <code>--prefix</code> is <code>GROUND_PREFIX_INVALID</code>"]);
for (const [k, v] of [["GROUND_POLL_INTERVAL_MS", m.GROUND_POLL_INTERVAL_MS], ["GROUND_STABLE_BOUND_MS", m.GROUND_STABLE_BOUND_MS], ["GROUND_PREFIX_MAX_STEPS", m.GROUND_PREFIX_MAX_STEPS], ["GROUND_PREFIX_VALUE_MAX", m.GROUND_PREFIX_VALUE_MAX], ["SESSION_VALUE_MIN_LENGTH", m.SESSION_VALUE_MIN_LENGTH], ["SESSION_VALUE_MIN_ENTROPY", m.SESSION_VALUE_MIN_ENTROPY.toFixed(1)], ["ASSERT_SETTLE_MS", m.ASSERT_SETTLE_MS], ["ASSERT_POLL_INTERVAL_MS", m.ASSERT_POLL_INTERVAL_MS], ["EXPECT_REQUESTS_SETTLE_MS", m.EXPECT_REQUESTS_SETTLE_MS], ["EXPECT_REQUESTS_COUNT_MAX", m.EXPECT_REQUESTS_COUNT_MAX], ["EXPECT_REQUESTS_EVIDENCE_MAX", m.EXPECT_REQUESTS_EVIDENCE_MAX], ["LOGIN_REMINT_MAX_RETRIES", m.LOGIN_REMINT_MAX_RETRIES]]) holds("scripts.html qa-run", run, [`<code>${k}</code> (${v})`]);
for (const r of m.RUN_IGNORE_RULES) holds("scripts.html qa-run", run, [`<code>${r}</code>`]);
if (!m.USAGE.includes("[--prefix <json>]")) bad.push("the runner USAGE no longer lists --prefix");
absent("scripts.html", scr, [STALE]);
holds("scripts.html", scr, ["FAILED_MINT_UNCONFIRMED", "FAILED_MINT_COMMAND_MISSING", "FAILED_MINT_OUTPUT"]);
// redaction-policy.html
const rp = read("documentation/reference/redaction-policy.html");
const md = read("plugins/relay/resources/redaction-policy.md");
const i = rp.indexOf(`<h2 id="qa-runner-evidence">`), j = rp.indexOf(`<h2 id="what-this-is-not">`);
const sec = i > 0 && j > i ? rp.slice(i, j) : "";
if (!sec) bad.push("the redaction policy page has no QA runner evidence section above the closing section");
const hd = /^## (QA runner evidence: .*)$/m.exec(md);
if (!hd || !sec.includes(`>${hd[1]}</h2>`)) bad.push("the section heading differs from the plugin policy heading");
holds("redaction-policy.html section", sec, [`<h3 id="session-values-source-first">`, `<h3 id="snapshots-personal-data">`, "FAILED_IGNORE_UNPROVEN", "not-applicable", "git check-ignore -q", "PRPs/redaction-extensions.txt", "SHA-256 digest", "can echo a typed value the page renders back", "Unlike a snapshot entry, a path is not withheld for an e-mail address", `at least ${m.SESSION_VALUE_MIN_LENGTH} characters long and has a Shannon entropy of at least ${m.SESSION_VALUE_MIN_ENTROPY.toFixed(1)} bits per character`, `at most ${m.EXPECT_REQUESTS_EVIDENCE_MAX} are listed`]);
const mdSec = md.slice(md.indexOf("## QA runner evidence"), md.indexOf("## What this policy is NOT"));
const labels = [...mdSec.matchAll(/^- \*\*([^*]+\.)\*\*/gm)].map((x) => x[1]);
if (labels.length !== 6) bad.push(`expected 6 bullet labels in the plugin policy section, found ${labels.length}`);
for (const lab of labels) holds("redaction-policy.html section", sec, [`<strong>${lab}</strong>`]);
holds("redaction-policy.html", rp, ["A further section covers the evidence the QA runner writes", `href="commands.html#relay-qa-run"`]);
// api-reference.md
const api = read("docs/api-reference.md");
const baseSrc = execFileSync("git", ["show", `${BASE}:plugins/relay/scripts/qa-run.mjs`], { encoding: "utf8", maxBuffer: 1 << 26 });
const baseNames = new Set([...baseSrc.matchAll(/^export (?:async function|function|const) ([A-Za-z0-9_]+)/gm)].map((x) => x[1]));
const fresh = Object.keys(m).filter((k) => !baseNames.has(k));
if (fresh.length < 40) bad.push(`only ${fresh.length} new exports found against the base`);
for (const k of fresh) if (!api.includes("`" + k + "`")) bad.push("docs/api-reference.md does not name the new export " + k);
for (const k of Object.keys(m.REASON_CATALOGUE)) if (!api.includes("`" + k + "`")) bad.push("docs/api-reference.md does not name the catalogue code " + k);
holds("docs/api-reference.md", api, [...HALTS.slice(0, 4), "--prefix", "expect_requests", "expect_value", "expect_not_visible", "expect_state", "is not reported as refreshed", "registers session values source-first", "FAILED_MINT_UNCONFIRMED", "FAILED_MINT_OUTPUT"]);
if (!/"session": "none"/.test(api) || !/240/.test(api)) bad.push("docs/api-reference.md lost a pinned token or lacks the session-less step");
absent("docs/api-reference.md", api, [STALE, "22 commands", "21 commands", "19 commands", "18 commands"]);
if (api.split("23 commands").length - 1 !== 2) bad.push("23 commands must appear exactly twice in docs/api-reference.md");
// validation pages
const vc = read("documentation/reference/validation-checks.html");
holds("validation-checks.html", vc, ["<strong>Opt-in rule sets.</strong>", "<strong>Run evidence.</strong>", "<code>vocabulary:</code>", "<code>prefix:</code>", "<code>network:</code>", "RUN_IGNORE_RULES", "prefix: the runner script must contain the named halt GROUND_PREFIX_INVALID", "with the run-evidence pins also the QA runner ignore rules, its session-value floor and the policy section that states both", "plus the opt-in rule sets for the reason-code catalogue and classification, stable grounding, run-evidence privacy, the step vocabulary, the grounding prefix and the request count with the bounded re-mint"]);
absent("validation-checks.html qa-run-contract", slice(vc, `<h2 id="qa-run-contract">`, `<h2 id="lane-derivation">`), ["none yet"]);
holds("validation-suite.html", read("documentation/guide/validation-suite.html"), ["It also pins the run-evidence rules of the QA runner", "It also pins the vocabulary the runner has gained"]);
// status.html
const st = read("documentation/roadmap/status.html");
holds("status.html", st, ["<code>qa-runner-grounding-vocabulary-v2</code></td>", "<dt>Grounding and vocabulary v2</dt>", "phases 1&ndash;7 shipped in 0.46.0"]);
const dec = read("docs/decisions.md").split("\n").filter((l) => /^## \[\d{4}-\d{2}-\d{2}\]/.test(l)).length;
const anti = read("docs/anti-patterns.md").replace(/<!--[\s\S]*?-->/g, "").split("\n").filter((l) => /^## \S/.test(l)).length;
const dm = /<code>decisions\.md<\/code> [^0-9]*(\d+) recorded decisions/.exec(st), am = /<code>anti-patterns\.md<\/code> [^0-9]*(\d+) forbidden patterns/.exec(st);
if (!dm || Number(dm[1]) !== dec) bad.push(`status.html decision count ${dm && dm[1]} differs from docs/decisions.md (${dec})`);
if (!am || Number(am[1]) !== anti) bad.push(`status.html anti-pattern count ${am && am[1]} differs from docs/anti-patterns.md (${anti})`);
// search index
const idx = JSON.parse(read("documentation/assets/data/search-index.json"));
const ex = (p) => (idx.find((e) => e.path === p) || { excerpt: "" }).excerpt;
holds("search-index commands excerpt", ex("reference/commands.html"), ["Twenty-three commands", "Since 0.46.0 /relay-qa-run grounds against the settled page"]);
holds("search-index scripts excerpt", ex("reference/scripts.html"), ["qa-run grounds against the settled page, classifies every case"]);
holds("search-index redaction excerpt", ex("reference/redaction-policy.html"), ["Also the QA runner evidence rules"]);
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
console.log(`PASS: every page states the 0.46.0 runner with its derived numbers (${fresh.length} new exports named)`);
'
```

Level 2c: diff hygiene, collateral-change fence and link integrity, scoped to the added lines of this phase.

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
node --input-type=module -e '
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
const BASE = "e7a40810f50004d46c5caaa6edaf6c0aec691dc3";
const bad = [];
const git = (...a) => execFileSync("git", a, { encoding: "utf8", maxBuffer: 1 << 28 });
const lines = (f, sign) => git("diff", "--unified=0", BASE, "--", f).split("\n").filter((l) => l.startsWith(sign) && !l.startsWith(sign.repeat(3))).map((l) => l.slice(1));
const SCOPE = ["documentation", "README.md", "docs/api-reference.md", "plugins/relay/.claude-plugin/plugin.json"];
const added = lines(SCOPE[0], "+").concat(lines("README.md", "+"), lines("docs/api-reference.md", "+"), lines("plugins/relay/.claude-plugin/plugin.json", "+"));
const FORBIDDEN = ".claude" + "/PRPs";
const PICT = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2300}-\u{23FF}]/gu;
const pictCount = (ls) => ls.reduce((n, l) => n + (l.match(PICT) || []).length, 0);
for (const re of [/\sstyle="/, /<style[\s>]/, /<link[\s>]/, /<img[\s>]/, /<script[\s>]/, /(?:href|src)="\/(?!\/)/]) if (added.some((l) => re.test(l))) bad.push("an added line violates the site invariants: " + re);
if (added.some((l) => l.includes("\r"))) bad.push("a CR was added");
const css = fs.readFileSync("documentation/assets/css/app.css", "utf8");
const known = new Set([...css.matchAll(/\.([A-Za-z_][A-Za-z0-9_-]*)/g)].map((x) => x[1]));
for (const l of added) for (const cm of l.matchAll(/class="([^"]+)"/g)) for (const c of cm[1].split(/\s+/)) if (c && !known.has(c) && !c.startsWith("language-")) bad.push("a CSS class the stylesheet does not define: " + c);
if (added.filter((l) => l.includes(FORBIDDEN)).some((l) => !l.includes("MUST NOT appear"))) bad.push("a forbidden path reference was introduced outside a quoted prohibition");
const ALLOW = {
  "documentation/reference/commands.html": ["adds <code>mint</code> to roles lacking it without changing a set value.</dd>", "it registers IndexedDB record keys and values as secrets beside cookie"],
  "documentation/reference/scripts.html": ["otherwise <code>STEP_UNGROUNDED</code>.</dd>", "it registers IndexedDB record keys and values as secrets beside cookie", "--route &lt;path&gt; [--role &lt;role&gt;] [--env-handle &lt;path&gt;]", "2 for bad arguments. The local-only guard runs before any request"],
  "documentation/reference/redaction-policy.html": ["versioned report that travels with the PR.</p>"],
  "documentation/reference/validation-checks.html": ["<a href=\"#auth-secrecy\">auth-secrecy</a>", "<a href=\"#qa-run-contract\">qa-run-contract</a>", "<strong>Unit tests (", "<strong>Unit tests:</strong> none yet", "cases[0] is pass with an empty evidence array", "missing or unreadable file: plugins/relay/resources/auth-kit.gitignore</code></pre>"],
  "documentation/guide/validation-suite.html": ["<code>auth-secrecy</code>", "<code>qa-run-contract</code>"],
  "documentation/roadmap/status.html": ["recorded decisions", "forbidden patterns", "and <code>test-auth-minted-session.prd.md</code> (4 phases, all complete).</p>"],
  "documentation/assets/data/search-index.json": ["\"excerpt\": \"Twenty-three commands", "\"excerpt\": \"Helper scripts written in Node.js", "\"excerpt\": \"Three-layer secret redaction"],
  "documentation/changelog.html": ["<h3 id=\"unreleased-changed\">Changed</h3>"],
  "docs/api-reference.md": ["| `/relay-auth-scripts [--role <role>]... [--refresh]`", "| `/relay-qa-run <feature> [--env-handle <path>]`", "| `qa-run.mjs`"],
  "README.md": ["(version "],
  "plugins/relay/.claude-plugin/plugin.json": ["\"version\""],
};
for (const [f, frags] of Object.entries(ALLOW)) for (const l of lines(f, "-")) if (!frags.some((x) => l.includes(x))) bad.push(`${f}: an unplanned existing line was changed: ${l.slice(0, 90)}`);
const changed = git("diff", "--name-only", BASE, "--", ...SCOPE).split("\n").filter(Boolean);
for (const f of changed) if (!(f in ALLOW)) bad.push("changed file without a removed-line allowance: " + f);
// A rewritten long line carries its own pre-existing pictographs (the check marks of docs/api-reference.md), so the count of the added lines may not exceed the count of the removed ones.
for (const f of changed) if (pictCount(lines(f, "+")) > pictCount(lines(f, "-"))) bad.push("a pictograph or emoji was added in " + f);
for (const f of changed.filter((x) => x.endsWith(".html"))) {
  const body = fs.readFileSync(f, "utf8");
  for (const l of lines(f, "+")) {
    for (const hm of l.matchAll(/href="([^"]+)"/g)) {
      const href = hm[1];
      if (/^(https?:|mailto:)/.test(href)) continue;
      const [p, frag] = href.split("#");
      const target = p === "" ? f : path.normalize(path.join(path.dirname(f), p));
      if (!fs.existsSync(target)) { bad.push(`${f}: link target missing: ${href}`); continue; }
      if (frag && !fs.readFileSync(target, "utf8").includes(`id="${frag}"`)) bad.push(`${f}: link fragment missing: ${href}`);
    }
    for (const im of l.matchAll(/\bid="([^"]+)"/g)) if (body.split(`id="${im[1]}"`).length - 1 !== 1) bad.push(`${f}: id is not unique: ${im[1]}`);
  }
  if (body.split("<h1").length - 1 !== 1) bad.push(`${f}: must carry exactly one h1`);
  if (body.split(`<div class="page-footer"></div>`).length - 1 !== 1) bad.push(`${f}: must carry exactly one page footer`);
}
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
console.log(`PASS: ${changed.length} changed files, no site invariant broken, no collateral line changed`);
'
```

### Level 3 INTEGRATION

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
node --test "scripts/validate/**/*.test.mjs"
```

The glob is quoted so Node expands it itself. The command exits non-zero when any test fails; the baseline at the end of phase 6 is 2125 tests, and this phase adds none through the Implementer. If the test pair has declared an `EXISTING_TEST_UPDATED` entry for this phase, add one `--test-skip-pattern` per exact test name it names, and no `--test-name-pattern`. The earlier run records one unexplained intermittent red of `qa-run-network-count.test.mjs` on a first run (14 green after, known defect KD-4); this phase touches no runner code, so a red of that file alone is answered by running that single file once more with `node --test scripts/validate/checks/qa-run-network-count.test.mjs`, and a red of any other file is a defect to report.

## Acceptance Criteria

- **AC-A1 (PRD AC-17):** `plugins/relay/.claude-plugin/plugin.json` carries the minor bump of its pre-feature value (`0.45.0` to `0.46.0`, patch 0), `documentation/changelog.html`'s first released heading is the same version with the id `v0-46-0` and a valid ISO date, `README.md` names it, and `npm run validate` passes `version-parity`. Delivered by Task 9; observed by Level 2a and Level 1.
- **AC-A2 (PRD AC-17):** The changelog keeps exactly one `<h2 id="unreleased">Unreleased</h2>` holding only a "Nothing yet" paragraph above the new release; the release carries an intro, `Added` and `Changed` subsections with the release id, the three previously unreleased entries byte-identical, and the section 7.5 manifest-bump line naming `0.45.0` and `0.46.0`. Delivered by Task 9; observed by Level 2a.
- **AC-A3 (PRD AC-1, AC-2, AC-11, AC-18):** The `/relay-qa-run` and `qa-run.mjs` entries, the API reference rows and the changelog describe the stable grounding wait (two equal snapshots, the derived interval and bound, `GROUND_UNSTABLE`), the paragraph, list-item and cell candidates, the grounding prefix (the derived cap, `GROUND_PREFIX_INVALID`, `GROUND_PREFIX_FAILED`, the separate snapshot file) and the `MSYS_NO_PATHCONV=1` note, and `scripts.html` lists `[--prefix <json>]` as the exported usage text does. Delivered by Tasks 1, 2, 7 and 9; observed by Level 2a and Level 2b.
- **AC-A4 (PRD AC-3, AC-4, AC-5):** The pages describe source-first registration with the derived floor, the origin-part exclusion and the accepted failure mode, the run-directory `.gitignore` for `grounding/` and `evidence/`, the `IGNORE_PROOF` line and `FAILED_IGNORE_UNPROVEN`, and `reference/redaction-policy.html` mirrors the plugin policy's section heading, subsections and bullet labels; the stale clause that every IndexedDB string is registered as a secret appears in no page. Delivered by Tasks 1, 2, 3, 7 and 9; observed by Level 2a and Level 2b.
- **AC-A5 (PRD AC-6, AC-7):** The pages name the four classes, every key of the exported `REASON_CATALOGUE` (with `PARTIAL_REMAINDER` runner-owned), `PLAN_ENTRY_INVALID` for a value outside the sets, `NO_PLAN_ENTRY` as a planner defect and the `classification` block beside the unchanged four-key `counts`. Delivered by Tasks 1, 2, 7 and 9; observed by Level 2a and Level 2b.
- **AC-A6 (PRD AC-8, AC-9, AC-10, AC-12, AC-15):** The pages describe the session-less request, `expect_value` (the value never recorded), `expect_not_visible` with its anchor, `expect_state` and `expect_requests` with the derived window, count bound and listing cap, the blocked `FAILED_NON_LOCAL_TARGET` on a matching non-approved host, and the caveats the runner has: the entries of a post-interaction snapshot can echo a typed value, and a listed request path is not withheld for an e-mail address. Delivered by Tasks 1, 2, 3, 7 and 9; observed by Level 2a and Level 2b.
- **AC-A7 (PRD AC-13, AC-19):** The pages state the bounded re-mint (a minted role only, after `FAILED_PROBE_MARKER_ABSENT`, at most once per role per run, a second halt keeping that halt's code, the template unchanged) and the `--refresh` role set (the approved model's matrix narrowed by `--role`, only existing scripts regenerated, a role the kit holds that the matrix does not list left as it is). Delivered by Tasks 1, 2, 7 and 9; observed by Level 2a and Level 2b.
- **AC-A8 (PRD AC-17):** `reference/validation-checks.html` and `guide/validation-suite.html` describe the rule sets `qa-run-contract` and `auth-secrecy` gained, with finding messages quoted from the check sources and unit-test counts equal to what the real test files report; no page states a check count other than 28 and no check is added. Delivered by Tasks 4, 5; observed by Level 2b and Level 1.
- **AC-A9 (PRD AC-17):** `roadmap/status.html` carries the feature row (8 phases, 0.46.0, dogfood pending) and a manual-QA section row, its decision and anti-pattern counts equal the source files, the search index excerpts of the three changed pages name the 0.46.0 behavior and mention only real commands, and every added link and id resolves and is unique. Delivered by Tasks 6, 8, 9; observed by Level 2b, Level 2c and Level 1.
- **AC-A10 (PRD AC-14):** The five frozen surfaces and the kit login template are byte-identical to the pre-feature commit `e7a40810f50004d46c5caaa6edaf6c0aec691dc3` and, while the loose phase-6 tree object exists, to that tree; the governance mirrors, the NAV script and the stylesheet are unchanged; no file outside the eleven planned files (and `docs/domain/` and `docs/context/`, which the docs-sync pass owns) changed since phase 6, and no test file changed. Delivered by Task 10; observed by Level 2a.
- **AC-A11 (PRD AC-17):** `npm run validate` passes all 28 checks and the corpus `node --test "scripts/validate/**/*.test.mjs"` exits 0 on the finished tree. Delivered by Task 10; observed by Level 1 and Level 3.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| A page states more than the runner does, or hides a leak caveat (a typed value echoed by snapshot entries, an e-mail address in a listed request path) | M | H | Statements are mirrored from the command document, the plugin policy and the glossary entries the docs-sync passes verified; the two caveats are stated in the text and checked as tokens; every number is derived from the runner's exports at validation time |
| The cut turns a corpus test red (a heading or position pin on the `Unreleased` block, a marker entry that must occur once) | M | M | The cut follows the shape of commit `4667d43`: a single fresh `Unreleased` above the release, release ids of the `v0-X-Y` shape, subsection text exactly `Added` and `Changed`, the existing entries moved untouched and none copied; Level 3 runs the whole corpus |
| An edit on a very long single-line `<dd>` or table row moves a sentence a test pins | M | M | Every edit is an anchored `Edit` of a few words, never a rewrite; Level 2c fails when any removed line is outside the allowance list; the pinned halt names, `240` and `Twenty-three commands` are asserted present |
| The install is not performed by this phase and the PRD row may read `complete` before it happens | H | L | The install clause is cited (PRD lines 233, 272, 273), put in `## NOT Building`, and given as ordered operator steps in `## Notes`; no acceptance criterion claims it |
| A changelog or search-index mention of a `/relay-` string that is not a command makes `registration-parity` red | L | M | Only real commands are named; Task 8 and Level 1 run the check |
| The plan-time gaps recorded in `docs-update.md` (DQ24, DQ27, DQ31) mean the command document lacks the "chosen, not measured" labels the pages now carry | M | L | The pages state the labels because the exported constants' comments do; the plugin text is not edited here and the gap is recorded in `## Notes` for the operator |
| The test-count cells read from a TAP run drift when the test pair later adds tests to the two files | L | L | The counts are checked only at this phase's gate; they are derived, not copied, and the next release re-derives them |
| The phase-6 tree object is garbage collected after the work is committed | M | L | The pre-feature commit fences (frozen surfaces, governance mirrors, search of the documentation paths) do not depend on it; only the phase-delta fence is skipped, with a printed note |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- **Test-file routing:** this phase's test-file creation and updates are routed through the `test-writer`/`test-reviewer` pair's lifecycle ledger (`/relay-write-test` then `/relay-test-write-review`), not authored by the Implementer; R-X is a blanket straight-fail on any test glob in the Implementer's diff. No task and no `## Files to Change` row targets a test file, so the per-task `**VALIDATE**` commands exercise the change directly (Task 4's block runs two existing test files only to read how many tests each reports) and Level 3 runs the existing corpus only as a regression gate.
- **Test-pair follow-up, new tests (`NEW_TEST_REQUIRED`):** content-invariant tests of the shape `docs-sync-phase4.test.mjs` uses, none of which exist yet for these pages: AC-A1 and AC-A2 (the manifest and the first release heading agree and the Unreleased block is empty and unique; the three carried-over entries sit under the release's `Changed` subsection), AC-A3 to AC-A7 (the derived-number tokens of `commands.html` and `scripts.html`, the redaction-policy section against the plugin policy's headings and bullet labels, `docs/api-reference.md` naming every export that is new against the pre-feature commit), AC-A8 (the two test counts equal the real runs) and AC-A9 (the status counts equal the source files).
- **Test-pair follow-up, existing assertions: none stale.** The inventory read every check and test that reads these pages. Only `version-parity` (and the real-tree call in `figma-track-phase1.test.mjs`) reads the manifest and changelog together; both stay green when the two change together. The pins this design keeps: `Twenty-three commands` and the other count words of `commands.html` and the search index, `23 commands` exactly twice in `docs/api-reference.md` and `22/21/19/18 commands` absent, the five `FAILED_MINT_*` names and `240` in `commands.html`, `scripts.html` and `docs/api-reference.md`, `FAILED_MINT_OUTPUT` and `IndexedDB` in the changelog, the literal `<h2 id="unreleased">Unreleased</h2>` exactly once above the newest release (about nine tests), the release ids of the `v0-X-Y` shape and the `Added`, `Changed` and `Fixed` subsection texts, and the single occurrence of `Kit authoring for the <code>minted</code> mechanism`. If the test pair finds an assertion this analysis missed, it is `EXISTING_TEST_UPDATED` and Level 3 excludes exactly those tests with `--test-skip-pattern`; no such test is known.
- **Operator steps after this phase, in order (the install is not performed by the loop).** The release-and-update procedure of this repository is the one recorded for the earlier cuts, and the directory marketplace `relay-marketplace` points at the main checkout `C:\repos\PRPs-agentic-eng`, so the commit must reach the branch checked out there. (1) `/relay:relay-commit qa-runner-grounding-vocabulary-v2` commits the worktree locally. (2) `/relay:relay-pr qa-runner-grounding-vocabulary-v2` pushes and opens the pull request (`--repo fabiombarreto/PRPs-agentic-eng`, base `development`). (3) Merge with a merge commit, never a rebase or a force-push (`/relay:relay-approve <pr>`). Earlier cuts were landed from a `release/<version>` branch by pull request; whether this tree is committed on the feature branch or carried to a release branch changes none of the later steps. (4) In the main checkout, have `development` checked out and up to date. (5) `claude plugin marketplace update relay-marketplace` refreshes the directory catalog. (6) `claude plugin update relay@relay-marketplace` creates the fresh `relay/0.46.0/` cache directory and repoints `installed_plugins.json`. (7) Restart Claude Code; the running session keeps the old version until then. (8) Confirm the installed version is `0.46.0` in the `/plugin` panel or in `installed_plugins.json`, and run `npm run validate` in the main checkout. The official plugin documentation says a plugin added from a local directory is loaded in place and needs no version bump, while this repository's recorded procedure treats the install as a copy into a versioned cache directory; confirm which one the installed Claude Code exhibits when step 8 is done. Phase 8 (the dogfood, with dedicated QA accounts planned first) needs step 8 and stops for the operator.
- **What no command here can do.** `documentation/AGENTS.md` section 8 step 8 (open the pages in a browser, check the sidebar highlight, the table of contents, the theme toggle and the search) is a human step; the structural gates above (one `h1`, unique ids, resolving links, only the CSS classes the stylesheet defines, no inline style) stand in for it and do not replace it. The operator may open the six edited pages with `file://` after the merge.
- **Docs-sync division.** The implement-time docs-sync pass (`docs-updater` and `docs-reviewer`, `docs_sync: true`) is scoped to `docs/context/` and `docs/domain/` and never touches `documentation/`; `docs/api-reference.md` lies outside its write scope (`docs-update.md` DQ1). This plan therefore edits `docs/api-reference.md` explicitly in Task 7, and the pass is expected to add nothing to the files this plan touches. The earlier phases already put the glossary and flows text in `docs/domain/`.
- **Diff base for review.** This phase's full diff is `git diff 896498d969724e4c3e65588eaea7c6af93b49771 -- . ':(exclude)PRPs'`, the single-argument form (never `<tree>..HEAD`; `HEAD` is still `e7a4081`). The exclusion removes only `PRPs/`; `documentation/`, `docs/`, `README.md` and `plugins/relay/.claude-plugin/` stay in it, which is the whole of this phase's diff plus whatever the docs-sync pass writes under `docs/domain/` and `docs/context/`. The whole-feature comparison uses the commit: `git diff --quiet e7a40810f50004d46c5caaa6edaf6c0aec691dc3 -- <files>`.
- **What the pages deliberately say and do not say.** A typed `fill` value is recorded in a post-interaction snapshot's `prefix` only as a SHA-256 digest, but the snapshot's `entries` are page text and can echo it; an unregistered identifier or an e-mail address in a listed request path can appear in `evidence/case-<index>.requests-<step>.json` (a listed path is masked only for a registered secret, a token-shaped value or a `regex:` match; the e-mail withholding rule is for snapshot entries only); a second re-mint halt keeps that halt's own code; and the numbers (the stability interval and bound, the redaction floor, the prefix caps, the re-read window of 5 seconds, the settle window of 2 seconds, the largest count, the listing of 50, the path cut of 200, the re-mint cap of 1) are chosen, not measured. No page names a candidate decision (C17 to C22) or an open question (DQ21 to DQ33); no page says the amended metrics hold.
- **Observations left for the operator (not edited here).** The command document and the policy bullet lack three statements the code comments carry (DQ27: the "chosen, not measured" labels, the 200-character cut of a listed path, the cost of a second mint), the `ground` usage text and the command document read as if a `goto` prefix step names an element (DQ24), and a `{{name}}` binding in `url_contains` is not re-validated after substitution (DQ31). `concepts/prp-artifacts.html` says run reports "should stay committed", which the run directory's ignored `grounding/` and `evidence/` qualify. `docs/development.md` still says "8 static consistency checks". None is in this phase's scope.
- **Research.** `research-codebase` ran once over the changelog shape, the version strings, the QA passages of the pages and the readers of them; `research-web` ran one round on plugin release conventions (Keep a Changelog, SemVer 0.y.z, the marketplace update commands) and found nothing that changes the repository's own contract. Three delegated read-only investigations covered the version sweep and release mechanics (every `0.45.0` string, the cut commits `4667d43`, `863cd41` and `bdec0bb`), the inventory of every check and test that reads the pages, the manifest or the counts (with the `npm run validate` baseline of 28 passed in about 2 seconds), and the exact export inventory of `qa-run.mjs` against the pre-feature commit (86 now, 32 before, none removed). The plan writer read the command document, the policy, the glossary entries, the pages and the check sources quoted above.
- **Verification record (2026-10-13, delegated read-only verifiers; nothing was written to the worktree).** Round 1, the unmodified tree: every block was extracted verbatim from this plan and run with `bash` from the worktree root. Level 1 and Task 10 exit 0 (`28 passed, 0 failed (28 checks run)`) and Level 2c exits 0 with no changed file; Tasks 1 to 9, Level 2a and Level 2b exit 1 with only the intended messages (missing tokens, a version that is not bumped, a planned file not changed, the status page counting 104 decisions against 105 in `docs/decisions.md`), and with no script error, no frozen-surface message and no scope message. That round found one defect, fixed before round 2: the bullet-label derivation of Task 3 and Level 2b also read the three bullets of the plugin policy section that follows the QA section. The reporter summary read for Task 4 is `# tests 15` for `qa-run-contract.test.mjs` and `# tests 23` for `auth-secrecy.test.mjs`. Round 2, a throwaway scratch clone at `e7a4081` overlaid with the staged phase-6 tree and carrying a rehearsal of Tasks 1 to 9 applied literally by exact-replacement scripts that assert one occurrence per anchor: every `**VALIDATE**` block exits 0 after its own task, Level 1, 2a, 2b and Task 10 exit 0, and Level 3 ran 2125 tests with 2125 passing and 0 failing in about 302 seconds. Level 2c exited 1 on its first run there (a pictograph already present on a rewritten `docs/api-reference.md` row counted as added); it now compares the pictographs of the added lines with those of the removed lines per file and exits 0 with 11 changed files. Fifteen single mutations of the finished tree (a missing token, a version of 0.47.0, a renamed release id, an edited carried-over entry, a touched frozen file, a pictograph, an inline style, a collateral edit of an unrelated sentence, a dangling link, a duplicate id, a dropped export name, broken JSON, a stale command mention, a wrong decision count, a forbidden path) each made the relevant block exit 1 with the intended message. The levels were re-run on the final text of this plan and exit 0 on the rehearsal tree. Both rounds also reported two small points that were corrected afterwards, with no third round (the two-round limit): the insertion points of Task 7 items 2 and 3(e) now say "immediately after" the preceding sentence and that the inserted block begins with a space, so a literal application leaves single spaces on both sides; and the Task 10 block now prints a `FAIL:` line and a `git diff --stat` before exiting 1 when a frozen surface differs (its exit codes are unchanged). Those two edits were not re-run.

*Generated: 2026-10-13*
*Approved: 2026-10-13*
*Implemented: 2026-10-13*
*Status: IMPLEMENTED*
