# Feature: Correct stale check-count claims on the validation-suite guide (description mode)

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting artifact creation (a plan the Implementer consumes); change spans three files under `documentation/`, so the single-file Scope Exemption in `docs/decision-gate.md` does not apply; impact on shared documentation surface
- Decisions found:
  - `docs/decisions.md` [2026-04-30] "Plugin manifest version is bumped on every minor/major release cut in documentation/changelog.html" — applies as a NEGATIVE constraint here: this change is a patch-level pure doc-site copy fix shipping zero assets under `plugins/relay/`, so `plugins/relay/.claude-plugin/plugin.json` MUST NOT be bumped. A bump would desynchronize the manifest from the latest released changelog heading and turn the `version-parity` check red.
  - `docs/decisions.md` [2026-07-12] "validation-suite" — records `documentation/guide/validation-suite.html` and `documentation/reference/validation-checks.html` as the doc-site coverage for the static validation suite; this change keeps the guide half of that pair truthful against the runner.
  - `docs/decisions.md` OQ-b (Docs Updater / Docs Reviewer scope) — "The `documentation/` rendered HTML site is explicitly out of scope and is maintained by release-cut phases rather than automated per-merge agents." This change is hand-authored under the `documentation/AGENTS.md` contract, which is exactly the sanctioned path.
- Applicable anti-patterns:
  - "Writing pipeline artifacts under the Claude settings directory" (`docs/anti-patterns.md`) — this plan and every artifact it produces resolve under `PRPs/`; no pipeline artifact is written to the settings directory.
  - "Treating `plugins/prp-core/` as active relay code" — not touched by this change; the check-count claims concern `plugins/relay/` and `scripts/validate/` only.
- Applicable architectural rules:
  - `documentation/AGENTS.md` section 2 invariants: no build step, no new CSS or JS file, no inline `<style>` block or `style=""` attribute, no emojis, relative paths only.
  - `documentation/AGENTS.md` section 7.4: every change under `documentation/` requires a changelog entry under `Unreleased`.
  - `documentation/AGENTS.md` section 7.5: a patch-level pure doc-site copy fix does NOT require a plugin manifest bump.
  - `documentation/AGENTS.md` section 9.2: `id` slugs must not be renamed — the right-rail TOC and inbound anchors depend on them.
  - `documentation/AGENTS.md` section 6.1: NAV is only touched when a page is added, renamed, or removed; none happens here.
- Result: PROCEED
```

## Source

Correct stale check-count claims on the validation-suite guide page and its search-index excerpt. Scope is exactly three files, all under documentation/: (1) documentation/guide/validation-suite.html, (2) documentation/assets/data/search-index.json (only the entry whose "path" is "guide/validation-suite.html"), (3) documentation/changelog.html (mandatory Unreleased entry per AGENTS.md 7.4).

Ground truth verified on the unmodified tree: `node scripts/validate/index.mjs` prints "11 passed, 0 failed (11 checks run)" and the 11th registered check is `timestamp-contract`. The authority for per-check facts is documentation/reference/validation-checks.html, whose totals line reads "149 node:test unit tests, all passing; npm run validate reports 11 checks" and whose summary-table Unit tests column sums to exactly 149. DO NOT MODIFY documentation/reference/validation-checks.html — it is already correct and is read-only for this change.

Required corrections in documentation/guide/validation-suite.html: the h2 heading text "The ten static checks" becomes "The eleven static checks" with the `id="the-checks"` slug byte-identical; the checks table gains an eleventh row for `timestamp-contract` as the last row, after `feedback-chain`, matching runner registration order; the bash comment "run all ten static checks" becomes "eleven" with column alignment preserved; and the illustrative sample output "4 passed, 6 failed (10 checks run)" is updated so the total is 11 and the arithmetic still sums to 11.

Explicitly LEAVE ALONE on that page: the "six agent/command files ... two agents missing their required tools field" day-one findings callout; the "The suite is two layers" framing; the "roughly fifty agent invocations across five phases" build-cost note; the "three glob segments" node --test warning. The guide page carries NO unit-test total, so no 149 figure needs to be introduced there.

Required correction in documentation/assets/data/search-index.json: in the single object whose "path" is "guide/validation-suite.html", the "excerpt" says "runs eight static consistency checks" (stale since v0.23.0, two counts behind). Change "eight" to "eleven". Change nothing else in that object and no other object in the file. In particular DO NOT touch the object whose "path" is "reference/validation-checks.html" — it is out of scope for this change even though its "(133 total)" figure disagrees with its own page's 149; that is a separately-tracked finding.

Required changelog entry in documentation/changelog.html: add entries under the EXISTING "Unreleased" block's "Fixed" section (create the Fixed h3 only if it does not already exist; do not create a new version block, do not rename Unreleased). The entry must name both corrected files and state that the guide page went stale at commit 5302839 (which registered the 11th check) while the search-index excerpt had been stale since v0.23.0. Use &mdash; entities in changelog.html, matching that file's own convention; validation-suite.html uses literal em-dashes.

Hard constraints, all binding, from documentation/AGENTS.md: no build step, no new CSS file, no new JS file, no inline style block, no style attribute; no emojis anywhere including the changelog entry; relative paths only; plugins/relay/.claude-plugin/plugin.json MUST NOT be bumped; documentation/assets/js/app.js MUST NOT be modified.

Validation-command requirements: the working tree is CRLF, so any grep for a phrase that could span a line break must normalize first with `tr -d '\r' | tr '\n' ' ' | tr -s ' '`. Every change-detecting VALIDATE command must FAIL on the unmodified tree and PASS only after the edit. Include `node scripts/validate/index.mjs` (must stay 11 passed, 0 failed), a JSON well-formedness assertion, an assertion that documentation/reference/validation-checks.html is byte-unchanged, and an assertion that the `id="the-checks"` slug still exists. Do NOT write any validation command that compares timestamps or depends on file mtime.

This is a documentation-only phase: phase_type docs. No test files are authored or modified (R-X strict).

## Summary

The static validation suite grew from eight to eleven registered checks across
v0.23.0, v0.24.0, and commit `5302839`, but two count claims about it were left
behind at different points in that history. This phase corrects both to eleven
and closes the coherence gap they open: the guide page's checks table still lists
only ten rows, so simply editing its heading to "eleven" would leave the page
internally contradictory. The change is four surgical edits to
`documentation/guide/validation-suite.html` (heading text, a new
`timestamp-contract` table row, a code-block comment, and the illustrative
runner-output total), one string edit to the guide's own entry in
`documentation/assets/data/search-index.json`, and a new `Fixed` section under
`Unreleased` in `documentation/changelog.html` per `AGENTS.md` section 7.4. No
plugin asset is touched, so no manifest bump applies. All per-check facts are
copied from `documentation/reference/validation-checks.html`, which is the
authority and is read-only for this change.

## User Story

```
As a developer reading the relay doc site to understand the plugin's self-test
I want the guide page and the site search results to state the real number of static checks, and the guide's checks table to list all of them
So that I can trust the page against what `npm run validate` actually prints, instead of discovering a three-check discrepancy myself
```

## Problem Statement

`documentation/guide/validation-suite.html` claims "The ten static checks" in its
section heading, repeats "run all ten static checks" in its runnable code block,
shows an illustrative runner summary ending "(10 checks run)", and lists exactly
ten rows in its checks table. `documentation/assets/data/search-index.json`'s
excerpt for that same page is worse — it says "eight static consistency checks",
two counts behind, stale since v0.23.0. Meanwhile
`node scripts/validate/index.mjs` registers eleven checks and reports
`11 passed, 0 failed (11 checks run)`.

Both were left untouched deliberately: the approved plan for the eleventh check
scoped its documentation update to `documentation/reference/validation-checks.html`
and that page's own search-index entry, and widening an approved plan's file set
at implement time risks a structural rejection at code review. The deferral was
ruled correctly-scoped (see the `R-S3` row of
`PRPs/plans/add-an-11th-static-check-to-scriptsvalidate-that.code-review.jsonl`),
which makes this the follow-up that discharges it. The reference page, its search
entry, and `CLAUDE.md` are all already correct at eleven.

## Solution Statement

Correct both claims to eleven, and bring the guide page's checks table to eleven
rows so the page does not merely swap one wrong number for an internally
inconsistent one. The `timestamp-contract` row's prose is derived from the
authority page's own summary row and per-check section rather than re-researched,
which keeps the two pages consistent by construction. The `id="the-checks"` slug
is preserved byte-for-byte so the right-rail TOC and any inbound anchors keep
working. The changelog gains a `Fixed` section under `Unreleased` recording both
corrections and their distinct staleness origins. Every other count-bearing
statement on the guide page was audited and is a non-drifted historical
statement, so it is left alone.

## Metadata

| Key | Value |
|-----|-------|
| Type | Documentation correction |
| Complexity | Low |
| Systems Affected | `documentation/` doc site (guide page, client-side search index, changelog) |
| Dependencies | None. `documentation/reference/validation-checks.html` must already be correct at eleven checks / 149 unit tests, which it is on the current tree. |
| Estimated Tasks | 4 |
| Source PRD line ref | Not applicable (description mode) |
| phase_type | docs |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `documentation/AGENTS.md` | 31-41, 239-286, 288-381, 400-407 | Binding contract for any change under `documentation/`: section 2 invariants, the three-file registration rule, changelog format and the section 7.5 plugin-bump rule, and the modify-an-existing-page checklist. |
| P0 | `documentation/guide/validation-suite.html` | 62-110 | The four edit sites: the `id="the-checks"` heading, the ten-row checks table, the `npm run validate` code-block comment, and the illustrative runner-output block. Read the full page first per `AGENTS.md` section 9.1. |
| P0 | `documentation/reference/validation-checks.html` | 24-54, 216-224 | The authority for per-check facts. Its summary-table `timestamp-contract` row and its `timestamp-contract` section supply the prose for the new guide row. Read-only for this change. |
| P1 | `documentation/changelog.html` | 31-128 | The `Unreleased` block. Shows the `h3` id convention (`unreleased-added`, `unreleased-changed`) and the multi-line `<li>` shape with `&mdash;` entities. No `Fixed` section exists yet, so this task creates it after `Changed`. |
| P1 | `documentation/assets/data/search-index.json` | 68-73 | The single entry to edit, with its key order (`title`, `path`, `category`, `excerpt`). |
| P1 | `scripts/validate/index.mjs` | 36-51 | The `CHECKS` registry, confirming eleven entries with `runTimestampContractCheck` last. This is the registration order the new table row must respect. |

## Patterns to Mirror

```html
# SOURCE: documentation/guide/validation-suite.html:80
          <tr><td><code>feedback-chain</code></td><td>The <code>prior_feedback</code> contract stays intact end to end: each registered pair's command forwards it, its writer declares it and defines a <code>## Targeted revision mode</code>, and <code>plan-writer</code> holds its three specific invariants (the input declared in both mode groups, the grounding carve-out naming all four grounding-dependent rubric ids, and the re-grounding anti-pattern agreeing with the Phase 2 short-circuit).</td></tr>
```

Copied by Task 1. This is the exact two-cell row shape the new `timestamp-contract`
row must use — `<code>name</code>` in the first cell, one sentence of prose in the
second, no anchor link (the guide table has no anchors, unlike the reference page's
summary table), and literal em-dash characters rather than `&mdash;` entities.

```html
# SOURCE: documentation/reference/validation-checks.html:48
          <tr><td><a href="#timestamp-contract">timestamp-contract</a></td><td>review_started_at contract mechanically enforced across reviewers, dispatching commands, and consumers</td><td>26</td></tr>
```

Consulted by Task 1 as the authority for what the new guide row asserts. The guide
row restates this in the guide's fuller prose voice; it does NOT copy the anchor
link or the unit-test count column, neither of which the guide table has.

```html
# SOURCE: documentation/changelog.html:114-117
        <li><strong><code>.claude/commands/efficiency-report.md</code></strong>
          &mdash; step 2's warning enumeration extended with the new
          degraded-exclusion <code>WARNING -</code> line so the skill does
          not walk past it.</li>
```

Copied by Task 3. The `<li><strong><code>path</code></strong> &mdash; prose</li>`
shape, wrapped across lines with the `&mdash;` entity leading the continuation
line. Note the entity form: this file does not use literal em-dashes in list prose.

```json
# SOURCE: documentation/assets/data/search-index.json:68-73
  {
    "title": "Validation suite",
    "path": "guide/validation-suite.html",
    "category": "Guide",
    "excerpt": "The plugin's own self-test: npm run validate runs eight static consistency checks and npm run eval checks the reviewer agents against golden fixtures. Why it exists, why it is built this way, how to run it, cost, and how to maintain it."
  },
```

Edited by Task 2. Only the word `eight` inside `excerpt` changes; key order,
indentation, and every sibling object stay byte-identical.

```javascript
# SOURCE: scripts/validate/index.mjs:39-51
const CHECKS = [
  runVersionParityCheck,
  runNativeValidateCheck,
  runRegistrationParityCheck,
  runPathExistenceCheck,
  runDispatchGraphCheck,
  runFrontmatterSchemaCheck,
  runArtifactNamingCheck,
  runBootstrapParityCheck,
  runGatingStructureCheck,
  runFeedbackChainCheck,
  runTimestampContractCheck,
];
```

Consulted by Task 1 for ordering only. The guide table's row order mirrors this
registry, which is why `timestamp-contract` goes last, after `feedback-chain`.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `documentation/guide/validation-suite.html` | UPDATE | Four count-dependent sites drifted when `5302839` registered the eleventh check: the `id="the-checks"` heading text, the ten-row checks table, the `npm run validate` code-block comment, and the illustrative runner-output total. |
| `documentation/assets/data/search-index.json` | UPDATE | The `guide/validation-suite.html` entry's `excerpt` says "eight static consistency checks", stale since v0.23.0 and two counts behind, so site search returns a wrong number before a reader ever opens the page. |
| `documentation/changelog.html` | UPDATE | `documentation/AGENTS.md` section 7.4 requires a changelog entry under `Unreleased` for every change under `documentation/`. No `Fixed` section exists under `Unreleased` yet, so this creates it after `Changed`. |

## NOT Building (Scope Limits)

- **Not editing `documentation/reference/validation-checks.html`.** It is already
  correct at eleven checks and 149 unit tests and is the authority this change
  reads from. It must be byte-unchanged; Level 3 asserts that.
- **Not correcting the `(133 total)` figure in the search-index entry whose `path`
  is `reference/validation-checks.html`.** That number disagrees with its own
  page's authoritative 149, but it is a separate finding about a different entry
  and a different page, outside this change's stated file set. Widening the file
  set is precisely the risk this plan exists to discharge, not to repeat.
- **Not bumping `plugins/relay/.claude-plugin/plugin.json`.** Patch-level pure
  doc-site copy fix shipping zero plugin assets; `AGENTS.md` section 7.5 requires
  a bump only for a minor or major cut, or a patch that ships something under
  `plugins/relay/`. A bump here would break `version-parity`.
- **Not cutting a release.** `Unreleased` stays named `Unreleased`; no new version
  block is created.
- **Not touching `documentation/assets/js/app.js`.** No page is added, renamed, or
  removed, so the NAV leg of the three-file registration rule does not apply.
- **Not touching `documentation/assets/css/app.css` or adding any CSS or JS file.**
  Every edit reuses existing markup and classes.
- **Not editing the guide page's non-drifted historical statements**: the day-one
  findings callout ("six agent/command files ... two agents missing their required
  `tools` field"), the "two layers" framing, the "roughly fifty agent invocations
  across five phases" build-cost note, and the "three glob segments" `node --test`
  warning. Each was audited and describes a historical event or a still-accurate
  structural fact, not a live count of the suite.
- **Not authoring or modifying any test file.** R-X strict; `tdd: false`
  (test-after) and this phase adds no checker code for the test pair to cover.

## Step-by-Step Tasks

### Task 1: UPDATE documentation/guide/validation-suite.html

- **ACTION**: Delivers AC-A1, AC-A2, and AC-A3. Read the full page first per
  `AGENTS.md` section 9.1, then make four
  edits. (a) Change the heading text on line 62 from `The ten static checks` to
  `The eleven static checks`, leaving `<h2 id="the-checks">` byte-identical — the
  slug must not change. (b) Append one new `<tr>` to the checks table as the LAST
  row, immediately after the `feedback-chain` row on line 80 and before
  `</tbody>`, for `timestamp-contract`; write its "What it asserts" cell in the
  guide's own voice using literal em-dash characters (never `&mdash;`), asserting
  that the `review_started_at` contract holds across registered reviewers,
  dispatching commands, and consumers, and that no post-marker jsonl verdict
  carries a `T00:00:00` stamp without an accompanying `timestamp_degraded` flag.
  (c) Change the code-block comment on line 94 from
  `# run all ten static checks` to `# run all eleven static checks`, preserving the
  existing column alignment of the comments in that block — the block is
  indent-sensitive per `AGENTS.md` section 5.7. (d) Change the last line of the
  illustrative runner-output block on line 110 from `4 passed, 6 failed (10 checks
  run)` to `5 passed, 6 failed (11 checks run)` so the total reads eleven and the
  passed-plus-failed arithmetic still sums to eleven.
- **MIRROR**: `# SOURCE: documentation/guide/validation-suite.html:80` for the row
  shape; `# SOURCE: documentation/reference/validation-checks.html:48` for what the
  new row asserts; `# SOURCE: scripts/validate/index.mjs:39-51` for row placement.
- **VALIDATE**:
  ```bash
  set -u
  G=documentation/guide/validation-suite.html
  norm() { tr -d '\r' < "$1" | tr '\n' ' ' | tr -s ' '; }
  count() { norm "$1" | grep -o -- "$2" | wc -l | tr -d ' '; }
  fail=0
  chk() { if [ "$2" != "$3" ]; then echo "FAIL: $1 (got $2, want $3)"; fail=1; else echo "PASS: $1"; fi; }
  chk "no 'ten static checks' remains"        "$(count "$G" 'ten static checks')" 0
  chk "'eleven static checks' appears twice"  "$(count "$G" 'eleven static checks')" 2
  chk "timestamp-contract row added"          "$(count "$G" 'timestamp-contract')" 1
  chk "no '(10 checks run)' remains"          "$(count "$G" '(10 checks run)')" 0
  chk "'(11 checks run)' present"             "$(count "$G" '(11 checks run)')" 1
  chk "id=the-checks slug preserved"          "$(count "$G" 'id="the-checks"')" 1
  chk "no &mdash; entity introduced"          "$(count "$G" '&mdash;')" 0
  [ "$fail" -eq 0 ] || exit 1
  ```

### Task 2: UPDATE documentation/assets/data/search-index.json

- **ACTION**: Delivers AC-A4. In the single object whose `"path"` is
  `"guide/validation-suite.html"`
  (line 68-73), change the `"excerpt"` phrase `runs eight static consistency
  checks` to `runs eleven static consistency checks`. Change nothing else in that
  object — key order, indentation, and the rest of the sentence stay identical —
  and change no other object in the file. In particular leave the object whose
  `"path"` is `"reference/validation-checks.html"` untouched.
- **MIRROR**: `# SOURCE: documentation/assets/data/search-index.json:68-73`.
- **VALIDATE**:
  ```bash
  set -euo pipefail
  node -e "
  const fs=require('fs');
  const raw=fs.readFileSync('documentation/assets/data/search-index.json','utf8');
  const d=JSON.parse(raw);
  const g=d.filter(o=>o.path==='guide/validation-suite.html');
  if(g.length!==1){console.error('FAIL: expected 1 guide entry, found '+g.length);process.exit(1);}
  if(!/runs eleven static consistency checks/.test(g[0].excerpt)){console.error('FAIL: guide excerpt does not say eleven');process.exit(1);}
  if(/eight static consistency checks/.test(g[0].excerpt)){console.error('FAIL: guide excerpt still says eight');process.exit(1);}
  const r=d.filter(o=>o.path==='reference/validation-checks.html');
  if(r.length!==1||!/133 total/.test(r[0].excerpt)){console.error('FAIL: reference entry was modified; it is out of scope');process.exit(1);}
  console.log('PASS: guide excerpt says eleven; reference entry untouched');
  "
  ```

### Task 3: UPDATE documentation/changelog.html

- **ACTION**: Delivers AC-A5. Add an `<h3 id="unreleased-fixed">Fixed</h3>` heading followed by a
  `<ul>` immediately after the `Unreleased` block's `Changed` list closes on line
  126 and before the `<h2 id="v0-25-0">` release heading on line 128 — the
  keepachangelog section order in `AGENTS.md` section 7.2 puts `Fixed` after
  `Changed`. Add two `<li>` entries, one per corrected file, using the `&mdash;`
  entity (never a literal em-dash — this file's convention differs from the guide
  page's). The first must name
  `documentation/guide/validation-suite.html`, enumerate the corrected sites, and
  state that the page went stale at commit `5302839`, which registered the
  eleventh check but deliberately scoped its documentation update to the reference
  page. The second must name `documentation/assets/data/search-index.json` and
  state that its guide excerpt had been two counts behind since v0.23.0,
  independently of the first. Do not rename `Unreleased`, do not create a new
  version block, and do not add an emoji.
- **MIRROR**: `# SOURCE: documentation/changelog.html:114-117`.
- **VALIDATE**:
  ```bash
  set -u
  C=documentation/changelog.html
  norm() { tr -d '\r' < "$1" | tr '\n' ' ' | tr -s ' '; }
  count() { norm "$1" | grep -o -- "$2" | wc -l | tr -d ' '; }
  fail=0
  chk() { if [ "$2" != "$3" ]; then echo "FAIL: $1 (got $2, want $3)"; fail=1; else echo "PASS: $1"; fi; }
  chk "Unreleased Fixed section created"      "$(count "$C" 'id="unreleased-fixed"')" 1
  chk "Unreleased heading not renamed"        "$(count "$C" 'id="unreleased"')" 1
  # expected 2, not 1: the historical release entry that added the guide page
  # already names this path once (changelog.html line 329); the new Fixed
  # entry adds the second occurrence.
  chk "guide page named in old + new entry"   "$(count "$C" 'documentation/guide/validation-suite.html')" 2
  chk "commit 5302839 cited"                  "$(count "$C" '5302839')" 1
  [ "$fail" -eq 0 ] || exit 1
  if ! norm "$C" | grep -q 'id="unreleased-fixed">Fixed</h3> <ul> <li>'; then
    echo "FAIL: Fixed heading is not immediately followed by a <ul><li>"; exit 1
  fi
  echo "PASS: changelog Fixed section well-formed"
  ```

### Task 4: VERIFY the untouched-file and site-invariant guarantees

- **ACTION**: Enforces AC-A6. Run no edits. Confirm the change did not exceed its declared file
  set or violate an `AGENTS.md` section 2 invariant: the validation suite still
  reports eleven passing checks; `documentation/reference/validation-checks.html`,
  `plugins/relay/.claude-plugin/plugin.json`, `documentation/assets/js/app.js`,
  and `documentation/assets/css/app.css` are all byte-unchanged against `HEAD`; no
  file was added under `documentation/assets/css` or `documentation/assets/js`;
  and no inline style or emoji was introduced into any edited file. If any
  assertion fails, revert the offending edit rather than relaxing the assertion.
- **MIRROR**: No code snippet is copied — this task asserts the boundaries the
  Decision Gate block above records, in particular the `AGENTS.md` section 7.5
  no-plugin-bump rule and the section 2.3 no-new-asset-file rule.
- **VALIDATE**:
  ```bash
  set -euo pipefail
  out=$(node scripts/validate/index.mjs)
  printf '%s\n' "$out"
  printf '%s\n' "$out" | grep -q "11 passed, 0 failed"
  for p in documentation/reference/validation-checks.html \
           plugins/relay/.claude-plugin/plugin.json \
           documentation/assets/js/app.js \
           documentation/assets/css/app.css; do
    if ! git diff --quiet -- "$p"; then echo "FAIL: $p must not be modified by this change"; exit 1; fi
  done
  if [ -n "$(git status --porcelain -- documentation/assets/css documentation/assets/js)" ]; then
    echo "FAIL: a file under documentation/assets/css or documentation/assets/js was added or modified (AGENTS.md 2.3)"; exit 1
  fi
  echo "PASS: suite green at 11; reference page, plugin manifest, and site assets untouched"
  ```

## Validation Commands

### Level 1 — STATIC_ANALYSIS

Parses the edited JSON and enforces the two `AGENTS.md` section 2 invariants that
are mechanically checkable on the edited files. This is an invariance guard: it
passes on the unmodified tree by design, and fails on a malformed edit. Both
negative controls were exercised against a mutated copy before this plan was
written — an appended `style="color:red"` trips the style guard, and an appended
emoji trips the emoji guard.

```bash
set -euo pipefail
node -e "
const fs=require('fs');
const d=JSON.parse(fs.readFileSync('documentation/assets/data/search-index.json','utf8'));
if(!Array.isArray(d)){console.error('search-index.json is not a JSON array');process.exit(1);}
const e=d.filter(o=>o.path==='guide/validation-suite.html');
if(e.length!==1){console.error('expected exactly 1 guide/validation-suite.html entry, found '+e.length);process.exit(1);}
for(const k of ['title','path','category','excerpt']){
  if(typeof e[0][k]!=='string'){console.error('entry missing string key: '+k);process.exit(1);}
}
console.log('PASS: search-index.json parses, '+d.length+' entries, guide entry keys intact');
"
for f in documentation/guide/validation-suite.html documentation/changelog.html; do
  if grep -nE '<style|style="' "$f"; then echo "FAIL: inline style in $f (AGENTS.md 2.4)"; exit 1; fi
done
node -e "
const fs=require('fs');
const re=/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu;
let bad=0;
for(const f of ['documentation/guide/validation-suite.html','documentation/changelog.html','documentation/assets/data/search-index.json']){
  const m=fs.readFileSync(f,'utf8').match(re);
  if(m){console.error('FAIL: emoji in '+f+': '+m.join(' '));bad=1;}
}
if(bad)process.exit(1);
console.log('PASS: no emojis in the three edited files');
"
echo "PASS: Level 1 static analysis clean"
```

Note: do NOT substitute `grep -P` for the Node emoji check. On this host
`grep -P` aborts with "supports only unibyte and UTF-8 locales" and returns
non-zero, which an `if` reads as "no emoji found" — a silently-degraded gate.
This was observed on the unmodified tree while authoring this plan.

### Level 2 — CONTENT_INVARIANTS

The change-detecting level. Every assertion below except the `id="the-checks"`
preservation guard FAILS on the unmodified tree and passes only after all three
files are edited. Verified: run against the unmodified tree this block exits 1
with 8 of 9 assertions failing. Each phrase is normalized with
`tr -d '\r' | tr '\n' ' ' | tr -s ' '` first because the tree is CRLF and the
target phrases can span a line break.

```bash
set -u
G=documentation/guide/validation-suite.html
S=documentation/assets/data/search-index.json
C=documentation/changelog.html
norm() { tr -d '\r' < "$1" | tr '\n' ' ' | tr -s ' '; }
count() { norm "$1" | grep -o -- "$2" | wc -l | tr -d ' '; }
fail=0
chk() { if [ "$2" != "$3" ]; then echo "FAIL: $1 (got $2, want $3)"; fail=1; else echo "PASS: $1"; fi; }
chk "guide: no 'ten static checks'"                 "$(count "$G" 'ten static checks')" 0
chk "guide: 'eleven static checks' x2"              "$(count "$G" 'eleven static checks')" 2
chk "guide: timestamp-contract row present"         "$(count "$G" 'timestamp-contract')" 1
chk "guide: no '(10 checks run)'"                   "$(count "$G" '(10 checks run)')" 0
chk "guide: '(11 checks run)' present"              "$(count "$G" '(11 checks run)')" 1
chk "guide: id=the-checks preserved"                "$(count "$G" 'id="the-checks"')" 1
chk "index: no 'eight static consistency checks'"   "$(count "$S" 'eight static consistency checks')" 0
chk "index: 'eleven static consistency checks'"     "$(count "$S" 'eleven static consistency checks')" 1
chk "changelog: Unreleased Fixed section exists"    "$(count "$C" 'id="unreleased-fixed"')" 1
[ "$fail" -eq 0 ] || exit 1
echo "PASS: all count claims corrected to eleven"
```

### Level 3 — INTEGRATION

Runs the real suite and asserts the change stayed inside its declared file set.
An invariance guard: it passes on the unmodified tree and fails the moment an
out-of-scope file is touched or a check turns red. Verified to exit 0 on the
unmodified tree.

```bash
set -euo pipefail
out=$(node scripts/validate/index.mjs)
printf '%s\n' "$out"
printf '%s\n' "$out" | grep -q "11 passed, 0 failed"
for p in documentation/reference/validation-checks.html \
         plugins/relay/.claude-plugin/plugin.json \
         documentation/assets/js/app.js \
         documentation/assets/css/app.css; do
  if ! git diff --quiet -- "$p"; then echo "FAIL: $p must not be modified by this change"; exit 1; fi
done
if [ -n "$(git status --porcelain -- documentation/assets/css documentation/assets/js)" ]; then
  echo "FAIL: a file under documentation/assets/css or documentation/assets/js was added or modified (AGENTS.md 2.3)"; exit 1
fi
echo "PASS: suite green at 11; reference page, plugin manifest, and site assets untouched"
```

## Acceptance Criteria

R8b (PRD AC-N token check) does not apply in description mode — there is no
source PRD, so no `(PRD AC-N)` token is carried on the items below.

- **AC-A1:** `documentation/guide/validation-suite.html` states eleven, not ten,
  everywhere it counts the static checks: the section heading, the `npm run
  validate` code-block comment, and the illustrative runner-output total. The
  string `ten static checks` and the string `(10 checks run)` no longer occur in
  the file.
- **AC-A2:** The guide page's checks table lists eleven rows, the eleventh being
  `timestamp-contract`, placed last to match the `CHECKS` registration order in
  `scripts/validate/index.mjs`, and its assertion prose agrees with
  `documentation/reference/validation-checks.html`.
- **AC-A3:** The `<h2>` element carrying the checks table keeps `id="the-checks"`
  byte-identical, so the right-rail TOC entry and any inbound anchor still
  resolve.
- **AC-A4:** The `documentation/assets/data/search-index.json` entry whose `path`
  is `guide/validation-suite.html` says `eleven static consistency checks`; every
  other entry in the file, including the one whose `path` is
  `reference/validation-checks.html`, is byte-unchanged, and the file still
  parses as a JSON array.
- **AC-A5:** `documentation/changelog.html` carries a `Fixed` section under the
  existing `Unreleased` block naming both corrected files, citing commit
  `5302839` for the guide page's drift and v0.23.0 for the search-index entry's,
  written with `&mdash;` entities and no emoji. `Unreleased` is not renamed and no
  new version block is created.
- **AC-A6:** `node scripts/validate/index.mjs` still reports
  `11 passed, 0 failed`, and `documentation/reference/validation-checks.html`,
  `plugins/relay/.claude-plugin/plugin.json`, `documentation/assets/js/app.js`,
  and `documentation/assets/css/app.css` are byte-unchanged against `HEAD`.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Correcting the heading to "eleven" while leaving the table at ten rows, producing a page that is internally inconsistent instead of merely wrong | Medium | Medium | Task 1 makes the heading edit and the table row addition a single task, and Level 2 asserts both the `eleven static checks` count and the presence of `timestamp-contract` in the same block, so neither can land alone. |
| A validation grep silently passes on the unmodified tree because the CRLF line endings break a phrase match | Medium | High | Every content assertion normalizes with `tr -d '\r' \| tr '\n' ' ' \| tr -s ' '` first, and the whole Level 2 block was executed against the unmodified tree while authoring this plan: it exits 1 with 8 of 9 assertions failing. |
| `grep -P` used for the emoji invariant degrades to a silent pass on this host | Confirmed | Medium | Level 1 uses a Node regex instead of `grep -P`, with the reason recorded inline. Both the emoji and inline-style guards were exercised against a deliberately mutated copy and both fire. |
| Scope creep into `documentation/reference/validation-checks.html` or its search-index entry, repeating the structural-rejection risk this plan exists to discharge | Medium | High | The reference page is listed under NOT Building, Level 3 asserts it is byte-unchanged against `HEAD`, and Task 2's validation asserts the reference search entry still carries its current `133 total` text. |
| A reflexive plugin manifest bump breaks `version-parity` | Low | High | `AGENTS.md` section 7.5's patch-level carve-out is recorded in the Decision Gate block and under NOT Building, and Level 3 asserts `plugin.json` is byte-unchanged. |
| `research-web` returned no findings for this phase | Confirmed | Low | Accepted. The subagent reported `degradation_reason`: all searches returned generic single-source-of-truth and docs-as-code marketing content with no citable material specific to numeric-count drift. This phase needs no external grounding — the authority is an in-repo page and the live runner output. |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- **No test files are authored or modified by this phase.** `test_frameworks:
  ["node:test"]` is declared, but this phase ships no checker code and no runtime
  behavior — it corrects prose and one JSON string. R-X strict is preserved
  trivially: the Implementer authors zero test files here, and there is nothing
  for the test pair to cover test-after.
- **Description mode.** This plan was generated from a free-text description with
  no source PRD, so `## Source` holds the verbatim description, the filename is
  flat (`<slug>.plan.md`, no `-phase-N-` segment), no PRD row was back-filled, and
  R8a/R8b/R8c do not apply.
- **Why the reference page is the authority, not the runner alone.** The runner
  proves the check count (eleven). It does not supply per-check prose or the unit
  test totals. `documentation/reference/validation-checks.html`'s summary table and
  its totals line ("149 `node:test` unit tests ... 11 checks") are the curated,
  self-consistent source — its Unit tests column sums to exactly 149 — so the new
  guide row restates that page rather than re-deriving facts from the check source.
- **The guide page carries no unit-test total.** It was audited for one; there is
  none, so no 149 figure is introduced. Introducing one would add a fourth count to
  keep in sync for no reader benefit.
- **Adjacent finding, deliberately out of scope.** The search-index entry whose
  `path` is `reference/validation-checks.html` ends "(133 total)", which contradicts
  that page's own authoritative 149. The `133` figure also appears in the existing
  `Unreleased` changelog entry. Both are outside this change's file set and are
  left for a separate correction; Task 2's validation actively asserts the
  reference entry was NOT edited, so this plan cannot silently absorb it.
- **Per-file em-dash convention.** `documentation/guide/validation-suite.html` uses
  literal em-dash characters (19 occurrences, zero `&mdash;` entities);
  `documentation/changelog.html` uses `&mdash;` in list prose and `&#8212;` in
  release headings. Each edit matches its own file, which is why Task 1's
  validation asserts zero `&mdash;` entities in the guide page.

*Generated: 2026-07-31*
*Approved: 2026-07-31*
*Status: IMPLEMENTED*
