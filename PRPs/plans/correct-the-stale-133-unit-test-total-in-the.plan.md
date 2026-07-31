# Feature: Correct the stale 133 unit-test total (description mode)

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting artifact creation (a plan the Implementer consumes); change spans two files under `documentation/`, so the single-file Scope Exemption in `docs/decision-gate.md` does not apply; impact on shared documentation surface
- Decisions found:
  - `docs/decisions.md` [2026-04-30] "Plugin manifest version is bumped on every minor/major release cut in documentation/changelog.html" — applies as a NEGATIVE constraint: this is a patch-level pure doc-site copy fix shipping zero assets under `plugins/relay/`, so `plugins/relay/.claude-plugin/plugin.json` MUST NOT be bumped; a bump would break the `version-parity` check.
  - `docs/decisions.md` [2026-07-12] "validation-suite" — records `documentation/reference/validation-checks.html` as doc-site coverage for the static suite; this change reconciles that page's search excerpt and changelog claims to the page's own verified totals.
  - `docs/decisions.md` OQ-b — `documentation/` is out of scope for the automated docs pair and is maintained by hand-authored edits under the `documentation/AGENTS.md` contract, which this change follows.
- Applicable anti-patterns:
  - "Writing pipeline artifacts under the Claude settings directory" (`docs/anti-patterns.md`) — this plan and its artifacts resolve under `PRPs/`.
  - "Treating `plugins/prp-core/` as active relay code" — not touched.
- Applicable architectural rules:
  - `documentation/AGENTS.md` section 2 invariants: no build step, no new CSS or JS file, no inline `<style>` block or `style=""` attribute, no emojis, relative paths only.
  - `documentation/AGENTS.md` section 7.3/7.4: the `Unreleased` block accumulates in-flight changes and every change under `documentation/` logs there; the keepachangelog convention the site follows sanctions correcting existing entries (its own FAQ: "There are always good reasons to improve a changelog").
  - `documentation/AGENTS.md` section 7.5: a patch-level pure doc-site copy fix does NOT bump the plugin manifest.
  - `documentation/AGENTS.md` section 6.1: NAV untouched — no page added, renamed, or removed.
- Result: PROCEED
```

## Source

Correct the stale 133 unit-test total in the validation-checks search excerpt and the changelog's Unreleased block, plus one contradicted placeholder note. Scope is exactly two files, both under documentation/: (1) documentation/assets/data/search-index.json (only the entry whose "path" is "reference/validation-checks.html"), (2) documentation/changelog.html (two in-place Unreleased corrections plus the mandatory new Fixed entry per AGENTS.md 7.4).

Ground truth verified on the unmodified tree, against BOTH the authority page and the live test corpus: documentation/reference/validation-checks.html's totals line reads "149 node:test unit tests, all passing; npm run validate reports 11 checks"; its summary-table Unit tests column sums to exactly 149; and every catalog row was verified against its real file by running node --test per file (version-parity 14, native-validate 5, registration-parity 11, path-existence 8, dispatch-graph 11, frontmatter-schema 13, artifact-naming 6, bootstrap-parity 6, gating-structure 12, feedback-chain 23, timestamp-contract 26, efficiency-metrics 12, eval layer 2 — sum 149, all passing). DO NOT MODIFY documentation/reference/validation-checks.html — it is the authority and is read-only for this change.

Required correction 1, documentation/assets/data/search-index.json: in the single object whose "path" is "reference/validation-checks.html", the "excerpt" ends "and the covering unit tests (133 total)." — stale: 133 was the total when commit 5302839 landed (11 suites with timestamp-contract at 22 tests, plus eval 2 = 133); commit cca5707 extended timestamp-contract to 26 and added the 12-test efficiency-metrics suite, moving the page's totals line to 149. Change "(133 total)" to "(149 total)". Change nothing else in that object and no other object — in particular the guide entry (path "guide/validation-suite.html") was corrected to "eleven" in commit d384dd2 and must stay byte-identical.

Required correction 2, documentation/changelog.html (Unreleased, Added): the parenthetical "(133 <code>node:test</code> unit tests across 11 checks)" is stale for the same reason AND was imprecise even at the time (133 included the eval layer's 2, so it was never "across 11 checks"). Replace with a parenthetical mirroring the authority page's shipped state. This phrase must be the ONLY occurrence of "149 <code>node:test</code>" in the file — other 149 mentions added by this change must use different phrasing so the count assertion stays pinned at 1.

Required correction 3, documentation/changelog.html (Unreleased, Changed): the sentence "Per-row and total counts are placeholders pending the test-writer/test-reviewer pair's authorship of both suites (<code>tdd: false</code>, test-after)." is now factually wrong and is contradicted by the SAME Unreleased block's own consumer-half Added entry, which records that scripts/efficiency.test.mjs (new suite) and timestamp-contract.test.mjs (extended) were authored by the test pair. Replace with a sentence stating the counts were placeholders when first drafted and have since become the real, verified figures. Use &mdash; entities; never a literal em-dash in this file.

Required correction 4, documentation/changelog.html: append ONE new <li> to the EXISTING Fixed list under Unreleased (created in d384dd2; currently 2 entries — do NOT create a second Fixed heading), naming documentation/assets/data/search-index.json, citing the 5302839 snapshot origin and cca5707 supersession, and noting the two Unreleased entries above were brought in line in the same commit. When mentioning 149 or 133 it must NOT use the exact phrases "149 <code>node:test</code>" or "133 <code>node:test</code>".

Explicitly LEAVE ALONE: the "22 <code>node:test</code> unit tests" claim (historically accurate; the consumer entry documents the suite as "(extended)", so the block is coherent about 22 growing to 26); the "13380" cli/cli issue number (any 133 grep must use a longer anchored pattern, never bare "133"); documentation/reference/validation-checks.html, CLAUDE.md, documentation/guide/validation-suite.html, plugins/relay/.claude-plugin/plugin.json, documentation/assets/js/app.js, documentation/assets/css/app.css.

This is a documentation-only phase: phase_type docs. No test files are authored or modified (R-X strict).

## Summary

The validation-checks reference page's own totals line reads 149 `node:test`
unit tests across the 11-check catalog plus the efficiency-metrics and
eval-layer suites — a figure verified row-by-row against the live corpus — but
two claims still carry the superseded 133: the page's search-index excerpt and
the changelog's Unreleased entry that recorded the original count correction.
A third claim in the same Unreleased block ("counts are placeholders pending
the test pair's authorship") is contradicted by the block's own consumer-half
entry, which records both suites as authored. This phase corrects all three in
place — sanctioned Unreleased curation under the keepachangelog convention the
site follows — and logs the fix as a third entry in the existing `Fixed`
section. Two files change; the authority page is read-only; no plugin asset is
touched, so no manifest bump applies.

## User Story

```
As a developer searching the relay doc site for the validation-checks catalog
I want the search excerpt and the changelog to carry the page's real unit-test total
So that the number I see in search results and release notes matches the totals line the page itself asserts and the corpus verifies
```

## Problem Statement

`documentation/assets/data/search-index.json`'s excerpt for
`reference/validation-checks.html` says "(133 total)" covering unit tests, and
`documentation/changelog.html`'s Unreleased Added entry says the count
references were "corrected (133 `node:test` unit tests across 11 checks)". Both
figures date from commit `5302839`'s snapshot: 11 check suites with
timestamp-contract at 22 tests, plus the eval layer's 2. Commit `cca5707`
extended timestamp-contract to 26 and added the 12-test efficiency-metrics
suite, moving the page's totals line to 149 — verified in this phase's
grounding by running every catalog suite individually (all pass; the column
sums exactly). The same Unreleased block also still says the page's per-row and
total counts "are placeholders pending the test-writer/test-reviewer pair's
authorship of both suites", which the block's own consumer-half entry
contradicts: it records `scripts/efficiency.test.mjs` (new suite) and
`timestamp-contract.test.mjs` (extended) as authored test-pair work. The 133
was also imprecise at birth — it included the eval layer's 2, so it was never
"across 11 checks".

## Solution Statement

Correct the search excerpt to "(149 total)". Curate the two stale Unreleased
claims in place — the 133 parenthetical becomes an accurate description of the
shipped state (149 across the check, efficiency-metrics, and eval-layer
suites; 11 registered checks), and the placeholder sentence becomes a
statement that the counts have since been verified real. In-place Unreleased
curation is the correct mechanism: the block has not shipped, and the
keepachangelog convention the site follows explicitly sanctions improving
existing entries. Log the fix as a third `<li>` in the existing `Fixed`
section. Pin every count assertion to pre-verified occurrence counts —
including the "13380" issue-number trap that a bare `133` grep would match —
and phrase-partition the new 149 mentions so each assertion stays exact.

## Metadata

| Key | Value |
|-----|-------|
| Type | Documentation correction |
| Complexity | Low |
| Systems Affected | `documentation/` doc site (client-side search index, changelog) |
| Dependencies | None. `documentation/reference/validation-checks.html` must already be correct at 149/11, which grounding verified against the live corpus. |
| Estimated Tasks | 4 |
| Source PRD line ref | Not applicable (description mode) |
| phase_type | docs |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `documentation/AGENTS.md` | 31-41, 288-381, 400-407 | Binding contract: section 2 invariants, changelog format (7.2 section vocabulary, 7.3 Unreleased semantics, 7.5 no-bump rule), and the modify-existing-page checklist. |
| P0 | `documentation/changelog.html` | 69-74, 96-99, 118-125, 128-147 | The three edit sites (stale-133 entry, placeholder sentence, Fixed list) and the consumer-half sentence that proves the placeholder note wrong. Read the full Unreleased block first per AGENTS.md 9.1. |
| P0 | `documentation/reference/validation-checks.html` | 31-54 | The authority: summary table whose Unit tests column sums to 149 and the totals line. Read-only for this change. |
| P1 | `documentation/assets/data/search-index.json` | 116-121 | The single entry to edit, with its key order (`title`, `path`, `category`, `excerpt`). |

## Patterns to Mirror

```json
# SOURCE: documentation/assets/data/search-index.json:116-121
  {
    "title": "Validation checks",
    "path": "reference/validation-checks.html",
    "category": "Reference",
    "excerpt": "Complete per-check catalog of the validation suite: for each of the eleven static checks and the eval layer, the functionality guarded, a passing example, a failing example with the verbatim finding text, and the covering unit tests (133 total)."
  },
```

Edited by Task 1. Only `133` inside the trailing parenthetical changes to
`149`; key order, indentation, and every sibling object stay byte-identical.

```html
# SOURCE: documentation/changelog.html:69-74
        <li><strong><code>documentation/reference/validation-checks.html</code></strong>,
          <strong><code>documentation/assets/data/search-index.json</code></strong>,
          <strong><code>CLAUDE.md</code></strong>
          &mdash; new <code>timestamp-contract</code> per-check section and
          summary-table row, and every ten-to-eleven count reference
          corrected (133 <code>node:test</code> unit tests across 11 checks).</li>
```

Edited by Task 2 (first edit): the closing parenthetical is replaced; the rest
of the entry stays byte-identical.

```html
# SOURCE: documentation/changelog.html:118-125
        <li><strong><code>documentation/reference/validation-checks.html</code></strong>
          &mdash; <code>timestamp-contract</code> section prose extended to
          describe the <code>CONSUMERS</code> registry and its
          comment-stripping executable-reference assertion; new
          <code>efficiency-metrics</code> section and summary-table row for
          <code>scripts/efficiency.test.mjs</code>. Per-row and total counts
          are placeholders pending the test-writer/test-reviewer pair's
          authorship of both suites (<code>tdd: false</code>, test-after).</li>
```

Edited by Task 2 (second edit): only the final sentence ("Per-row and total
counts ... test-after).") is replaced. The consumer-half entry at
`documentation/changelog.html:96-99` ("`scripts/efficiency.test.mjs` (new
suite) and ... `timestamp-contract.test.mjs` (extended) are test-pair work") is
the in-block evidence that this sentence is now false — quoted here as the
justification, not itself edited.

```html
# SOURCE: documentation/changelog.html:142-146
        <li><strong><code>documentation/assets/data/search-index.json</code></strong>
          &mdash; the Validation suite guide's search excerpt said "eight
          static consistency checks", two counts behind and stale since
          v0.23.0, independently of the guide page's own drift; corrected to
          eleven.</li>
```

Copied by Task 3: the exact shape of the Fixed list's last `<li>` — bold-code
filename, `&mdash;` entity on the continuation line, prose, corrected value —
which the new third entry mirrors, inserted immediately before the list's
closing `</ul>` at line 147.

```html
# SOURCE: documentation/reference/validation-checks.html:54
      <p><strong>Totals:</strong> 149 <code>node:test</code> unit tests, all passing; <code>npm run validate</code> reports 11 checks, all PASS on the current tree.</p>
```

Consulted by Tasks 1 and 2 as the authority for the replacement figures. Not
edited.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `documentation/assets/data/search-index.json` | UPDATE | The reference-page entry's excerpt says "(133 total)" against the page's own authoritative, corpus-verified 149 — site search shows a wrong total before the reader opens the page. |
| `documentation/changelog.html` | UPDATE | Two Unreleased claims are stale (the 133 parenthetical; the placeholder sentence contradicted by the block's own consumer-half entry), and AGENTS.md 7.4 requires this change's own Fixed entry. |

## NOT Building (Scope Limits)

- **Not editing `documentation/reference/validation-checks.html`.** It is the
  authority at 149/11, verified row-by-row against the live corpus; Level 3
  asserts it is byte-unchanged.
- **Not editing the changelog's "22 `node:test` unit tests" claim.** It is
  historically accurate for what commit `5302839` authored, and the same
  block's consumer-half entry explicitly documents the suite as "(extended)" —
  the block is internally coherent about 22 growing to 26. Level 2 asserts the
  claim survives.
- **Not touching the "13380" cli/cli issue reference.** It is an issue number
  that happens to contain the digits 133; every 133 assertion in this plan uses
  a longer anchored pattern, and Level 2 asserts the issue reference survives.
- **Not editing `CLAUDE.md` or `documentation/guide/validation-suite.html`.**
  Neither contains a 133 claim (grounding grepped both); the guide page was
  corrected in `d384dd2` and Level 1 asserts its search entry has not
  regressed.
- **Not bumping `plugins/relay/.claude-plugin/plugin.json`** (AGENTS.md 7.5
  patch-level carve-out) and **not cutting a release** — `Unreleased` stays
  `Unreleased`.
- **Not touching NAV, `app.js`, or `app.css`** — no page added, renamed, or
  removed; no new asset file.
- **Not authoring or modifying any test file** (R-X strict; this phase ships
  prose and one JSON string).

## Step-by-Step Tasks

### Task 1: UPDATE documentation/assets/data/search-index.json

- **ACTION**: Delivers AC-A1. In the single object whose `"path"` is
  `"reference/validation-checks.html"` (lines 116-121), change the excerpt's
  trailing parenthetical `(133 total)` to `(149 total)` — the authority page's
  totals-line figure, verified against the live corpus during grounding.
  Change nothing else in that object, and no other object in the file; the
  guide entry (path `"guide/validation-suite.html"`) must keep saying "eleven
  static consistency checks" byte-identically (corrected in `d384dd2`).
- **MIRROR**: `# SOURCE: documentation/assets/data/search-index.json:116-121`
  for the object; `# SOURCE: documentation/reference/validation-checks.html:54`
  for the replacement figure.
- **VALIDATE**:
  ```bash
  set -euo pipefail
  node -e "
  const fs=require('fs');
  const d=JSON.parse(fs.readFileSync('documentation/assets/data/search-index.json','utf8'));
  const r=d.filter(o=>o.path==='reference/validation-checks.html');
  if(r.length!==1){console.error('FAIL: expected 1 reference entry, found '+r.length);process.exit(1);}
  if(!/\(149 total\)/.test(r[0].excerpt)){console.error('FAIL: reference excerpt does not say (149 total)');process.exit(1);}
  if(/133/.test(r[0].excerpt)){console.error('FAIL: reference excerpt still contains 133');process.exit(1);}
  const g=d.filter(o=>o.path==='guide/validation-suite.html');
  if(g.length!==1||!/eleven static consistency checks/.test(g[0].excerpt)){console.error('FAIL: guide entry regressed');process.exit(1);}
  console.log('PASS: reference excerpt says (149 total); guide entry unregressed');
  "
  ```

### Task 2: UPDATE documentation/changelog.html — two in-place Unreleased corrections

- **ACTION**: Delivers AC-A2 and AC-A3, via two narrow edits. (a) In the
  Unreleased Added entry at lines 69-74, replace the closing parenthetical
  `(133 <code>node:test</code> unit tests across 11 checks)` with
  `(149 <code>node:test</code> unit tests across the check, efficiency-metrics, and eval-layer suites; <code>npm run validate</code> reports 11 checks)`
  — accurate on both axes the old text got wrong (the total, and what the
  total spans). This replacement must remain the ONLY occurrence of the exact
  phrase `149 <code>node:test</code>` in the file; every other 149 mention this
  change introduces uses different phrasing (Task 3's Fixed entry uses
  `(133 total)`/`(149 total)` quotes and bare numbers). (b) In the Unreleased
  Changed entry at lines 118-125, replace the final sentence `Per-row and
  total counts are placeholders pending the test-writer/test-reviewer pair's
  authorship of both suites (<code>tdd: false</code>, test-after).` with a
  sentence stating the counts were placeholders when the entry was first
  drafted and are now the real figures — the pair has since authored both
  suites test-after (as the consumer-half entry above records), and the page's
  26-test and 12-test rows and its 149-test totals line match the live corpus.
  Use `&mdash;` entities if a dash is needed; this file never uses literal
  em-dashes in list prose.
- **MIRROR**: `# SOURCE: documentation/changelog.html:69-74` and
  `# SOURCE: documentation/changelog.html:118-125` for the edit sites;
  `# SOURCE: documentation/reference/validation-checks.html:54` for the
  figures.
- **VALIDATE**:
  ```bash
  set -u
  C=documentation/changelog.html
  norm() { tr -d '\r' < "$1" | tr '\n' ' ' | tr -s ' '; }
  count() { norm "$1" | grep -o -- "$2" | wc -l | tr -d ' '; }
  fail=0
  chk() { if [ "$2" != "$3" ]; then echo "FAIL: $1 (got $2, want $3)"; fail=1; else echo "PASS: $1"; fi; }
  chk "no '133 <code>node:test</code>'"   "$(count "$C" '133 <code>node:test</code>')" 0
  chk "'149 <code>node:test</code>' x1"   "$(count "$C" '149 <code>node:test</code>')" 1
  chk "placeholder sentence gone"         "$(count "$C" 'are placeholders pending')" 0
  chk "'22 <code>node:test</code>' kept"  "$(count "$C" '22 <code>node:test</code>')" 1
  chk "'13380' issue ref kept"            "$(count "$C" '13380')" 1
  [ "$fail" -eq 0 ] || exit 1
  echo "PASS: both Unreleased corrections landed, adjacent claims intact"
  ```

### Task 3: UPDATE documentation/changelog.html — third Fixed entry

- **ACTION**: Delivers AC-A4. Append one `<li>` to the EXISTING
  `<h3 id="unreleased-fixed">Fixed</h3>` list (lines 128-147; currently 2
  entries), inserted immediately before the list's closing `</ul>` and
  mirroring the last entry's shape. The entry names
  `documentation/assets/data/search-index.json` and states: the
  validation-checks reference excerpt said "(133 total)" covering unit tests
  against the page's own authoritative totals line of 149, verified against
  the live corpus (every summary-table row matches its actual suite); 133
  dates from `5302839`'s snapshot (timestamp-contract at 22 tests, no
  efficiency-metrics suite) and was superseded by `cca5707`; corrected to
  "(149 total)", with the two Unreleased entries above brought in line with
  the shipped figures in the same commit. Use `&mdash;` entities and no emoji.
  Do NOT use the exact phrases `149 <code>node:test</code>` or
  `133 <code>node:test</code>` anywhere in this entry (Task 2's pinned counts
  depend on it); quote the excerpt strings or use bare numbers instead.
- **MIRROR**: `# SOURCE: documentation/changelog.html:142-146`.
- **VALIDATE**:
  ```bash
  set -u
  C=documentation/changelog.html
  norm() { tr -d '\r' < "$1" | tr '\n' ' ' | tr -s ' '; }
  count() { norm "$1" | grep -o -- "$2" | wc -l | tr -d ' '; }
  fail=0
  chk() { if [ "$2" != "$3" ]; then echo "FAIL: $1 (got $2, want $3)"; fail=1; else echo "PASS: $1"; fi; }
  chk "Fixed list has 3 entries"    "$(sed -n '/id="unreleased-fixed"/,/<\/ul>/p' "$C" | grep -c '<li>')" 3
  chk "single Fixed heading"        "$(count "$C" 'id="unreleased-fixed"')" 1
  chk "Unreleased not renamed"      "$(count "$C" 'id="unreleased"')" 1
  chk "cca5707 cited"               "$(count "$C" 'cca5707')" 1
  chk "'149 <code>node:test</code>' still x1 (phrase partition held)" "$(count "$C" '149 <code>node:test</code>')" 1
  [ "$fail" -eq 0 ] || exit 1
  echo "PASS: third Fixed entry appended, phrase partition held"
  ```

### Task 4: VERIFY the untouched-file and site-invariant guarantees

- **ACTION**: Enforces AC-A5. Run no edits. Confirm the change stayed inside
  its two-file set and violated no AGENTS.md section 2 invariant: the suite
  still reports eleven passing checks; the authority page, the guide page,
  `CLAUDE.md`, the plugin manifest, `app.js`, and `app.css` are byte-unchanged
  against `HEAD`; no file was added under the site's asset directories; no
  inline style or emoji entered either edited file. If any assertion fails,
  revert the offending edit rather than relaxing the assertion.
- **MIRROR**: No snippet copied — this task asserts the boundaries the
  Decision Gate block records (AGENTS.md 7.5 no-bump rule, 2.3
  no-new-asset-file rule, and the authority page's read-only status).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  out=$(node scripts/validate/index.mjs)
  printf '%s\n' "$out"
  printf '%s\n' "$out" | grep -q "11 passed, 0 failed"
  for p in documentation/reference/validation-checks.html \
           documentation/guide/validation-suite.html \
           plugins/relay/.claude-plugin/plugin.json \
           documentation/assets/js/app.js \
           documentation/assets/css/app.css \
           CLAUDE.md; do
    if ! git diff --quiet -- "$p"; then echo "FAIL: $p must not be modified by this change"; exit 1; fi
  done
  if [ -n "$(git status --porcelain -- documentation/assets/css documentation/assets/js)" ]; then
    echo "FAIL: a file under documentation/assets/css or documentation/assets/js was added or modified (AGENTS.md 2.3)"; exit 1
  fi
  echo "PASS: suite green at 11; authority page, guide page, manifest, and site assets untouched"
  ```

## Validation Commands

### Level 1 — STATIC_ANALYSIS

Invariance guard: passes on the unmodified tree by design and fails on a
malformed edit. The emoji check deliberately uses a Node regex, NOT `grep -P`:
on this host `grep -P` aborts with "supports only unibyte and UTF-8 locales"
and reads as a silent pass — observed directly, with negative controls (an
appended `style=""` and an appended emoji) exercised against a mutated copy in
the prior phase.

```bash
set -euo pipefail
node -e "
const fs=require('fs');
const d=JSON.parse(fs.readFileSync('documentation/assets/data/search-index.json','utf8'));
if(!Array.isArray(d)){console.error('search-index.json is not a JSON array');process.exit(1);}
const r=d.filter(o=>o.path==='reference/validation-checks.html');
if(r.length!==1){console.error('expected exactly 1 reference/validation-checks.html entry, found '+r.length);process.exit(1);}
for(const k of ['title','path','category','excerpt']){
  if(typeof r[0][k]!=='string'){console.error('reference entry missing string key: '+k);process.exit(1);}
}
const g=d.filter(o=>o.path==='guide/validation-suite.html');
if(g.length!==1||!/eleven static consistency checks/.test(g[0].excerpt)){console.error('guide entry regressed — must keep saying eleven (d384dd2)');process.exit(1);}
console.log('PASS: JSON parses, '+d.length+' entries, reference keys intact, guide entry unregressed');
"
if grep -nE '<style|style="' documentation/changelog.html; then echo "FAIL: inline style in changelog.html (AGENTS.md 2.4)"; exit 1; fi
node -e "
const fs=require('fs');
const re=/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu;
let bad=0;
for(const f of ['documentation/changelog.html','documentation/assets/data/search-index.json']){
  const m=fs.readFileSync(f,'utf8').match(re);
  if(m){console.error('FAIL: emoji in '+f+': '+m.join(' '));bad=1;}
}
if(bad)process.exit(1);
console.log('PASS: no emojis in the two edited files');
"
echo "PASS: Level 1 static analysis clean"
```

### Level 2 — CONTENT_INVARIANTS

The change-detecting level. Executed against the unmodified tree while
authoring this plan: it exits 1 with exactly the six change-detecting
assertions failing and the four invariance assertions passing. Every phrase is
normalized with `tr -d '\r' | tr '\n' ' ' | tr -s ' '` first (CRLF tree), and
every 133 pattern is anchored longer than the bare digits so the "13380"
cli/cli issue number can never satisfy or pollute it.

```bash
set -u
S=documentation/assets/data/search-index.json
C=documentation/changelog.html
norm() { tr -d '\r' < "$1" | tr '\n' ' ' | tr -s ' '; }
count() { norm "$1" | grep -o -- "$2" | wc -l | tr -d ' '; }
fail=0
chk() { if [ "$2" != "$3" ]; then echo "FAIL: $1 (got $2, want $3)"; fail=1; else echo "PASS: $1"; fi; }
chk "index: no '(133 total)'"                      "$(count "$S" '(133 total)')" 0
chk "index: '(149 total)' present"                 "$(count "$S" '(149 total)')" 1
chk "changelog: no '133 <code>node:test</code>'"   "$(count "$C" '133 <code>node:test</code>')" 0
chk "changelog: '149 <code>node:test</code>' x1"   "$(count "$C" '149 <code>node:test</code>')" 1
chk "changelog: placeholder sentence gone"         "$(count "$C" 'are placeholders pending')" 0
chk "changelog: Fixed list has 3 entries"          "$(sed -n '/id="unreleased-fixed"/,/<\/ul>/p' "$C" | grep -c '<li>')" 3
chk "changelog: '22 <code>node:test</code>' kept"  "$(count "$C" '22 <code>node:test</code>')" 1
chk "changelog: '13380' issue ref kept"            "$(count "$C" '13380')" 1
chk "changelog: single Fixed heading"              "$(count "$C" 'id="unreleased-fixed"')" 1
chk "changelog: Unreleased not renamed"            "$(count "$C" 'id="unreleased"')" 1
[ "$fail" -eq 0 ] || exit 1
echo "PASS: all count corrections landed, invariants held"
```

### Level 3 — INTEGRATION

Runs the real suite and asserts the change stayed inside its declared file
set. Invariance guard: verified to exit 0 on the unmodified tree; fails the
moment an out-of-scope file is touched or a check turns red.

```bash
set -euo pipefail
out=$(node scripts/validate/index.mjs)
printf '%s\n' "$out"
printf '%s\n' "$out" | grep -q "11 passed, 0 failed"
for p in documentation/reference/validation-checks.html \
         documentation/guide/validation-suite.html \
         plugins/relay/.claude-plugin/plugin.json \
         documentation/assets/js/app.js \
         documentation/assets/css/app.css \
         CLAUDE.md; do
  if ! git diff --quiet -- "$p"; then echo "FAIL: $p must not be modified by this change"; exit 1; fi
done
if [ -n "$(git status --porcelain -- documentation/assets/css documentation/assets/js)" ]; then
  echo "FAIL: a file under documentation/assets/css or documentation/assets/js was added or modified (AGENTS.md 2.3)"; exit 1
fi
echo "PASS: suite green at 11; authority page, guide page, manifest, and site assets untouched"
```

## Acceptance Criteria

R8b (PRD AC-N token check) does not apply in description mode — there is no
source PRD, so no `(PRD AC-N)` token is carried on the items below.

- **AC-A1:** The search-index entry whose `path` is
  `reference/validation-checks.html` says "(149 total)" and contains no 133;
  every other entry — including the guide entry corrected in `d384dd2` — is
  byte-unchanged, and the file still parses as a JSON array.
- **AC-A2:** The changelog's Unreleased Added parenthetical describes the
  shipped state — 149 unit tests across the check, efficiency-metrics, and
  eval-layer suites, 11 registered checks — and the exact phrase
  `149 <code>node:test</code>` occurs exactly once in the file while
  `133 <code>node:test</code>` occurs zero times.
- **AC-A3:** The "are placeholders pending" sentence is gone, replaced by a
  statement that the page's counts are now the real, corpus-verified figures;
  the sentence's replacement does not disturb the rest of its entry.
- **AC-A4:** The Unreleased `Fixed` list holds exactly 3 entries under a single
  `unreleased-fixed` heading, the third naming
  `documentation/assets/data/search-index.json`, citing `5302839`'s snapshot
  origin and `cca5707`'s supersession, written with `&mdash;` entities and no
  emoji, and `Unreleased` is not renamed.
- **AC-A5:** The changelog's "22 `node:test` unit tests" claim and the "13380"
  issue reference survive byte-identically; `node scripts/validate/index.mjs`
  still reports `11 passed, 0 failed`; and the authority page, guide page,
  `CLAUDE.md`, plugin manifest, `app.js`, and `app.css` are byte-unchanged
  against `HEAD`.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| A bare `133` grep matches the "13380" cli/cli issue number, making an assertion pass or fail for the wrong reason | Confirmed present | High | Every 133 pattern is anchored (`(133 total)`, `133 <code>node:test</code>`), and Level 2 positively asserts the `13380` reference survives — pre-verified: the anchored patterns each match exactly once on the unmodified tree and the issue number is untouched by them. |
| The new Fixed entry or placeholder replacement reuses the exact phrase `149 <code>node:test</code>`, silently breaking the pinned x1 assertion after a correct-looking edit | Medium | Medium | Tasks 2 and 3 partition the phrasing explicitly (only the Added parenthetical uses the phrase; the Fixed entry quotes "(133 total)"/"(149 total)"), and Task 3's VALIDATE re-asserts the x1 pin after the append. |
| Writing 149 into new places while the figure is itself wrong | Low | High | Grounding verified 149 three ways before this plan was written: the authority page's totals line, its summary column sum, and a per-file `node --test` run of every catalog suite (all counts match, all pass). |
| In-place edits to Unreleased entries seen as rewriting history | Low | Low | The block is unreleased — the keepachangelog convention the site follows sanctions correcting entries (its FAQ: "There are always good reasons to improve a changelog"), and the new Fixed entry explicitly records that the two entries were brought in line. |
| CRLF line endings make a multi-word grep silently miss | Medium | High | Every content assertion normalizes with `tr -d '\r' \| tr '\n' ' ' \| tr -s ' '` first; the full Level 2 block was executed on the unmodified tree and exits 1 with exactly the six change-detecting assertions failing. |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- **No test files are authored or modified by this phase.** R-X strict is
  preserved trivially: the phase ships one JSON string and changelog prose.
- **Description mode.** No source PRD; `## Source` holds the verbatim
  description; flat filename; no PRD back-fill; R8a/R8b/R8c do not apply.
- **Why 133 and why it is wrong twice.** 133 = the 11 check suites with
  timestamp-contract at its original 22 tests, plus the eval layer's 2 —
  `5302839`'s snapshot. `cca5707` extended timestamp-contract to 26 (+4
  consumer-end tests) and added the 12-test efficiency-metrics suite:
  149. The old parenthetical's "across 11 checks" was additionally wrong at
  birth, since 133 already included the eval layer's 2 (the 11 check suites
  alone summed to 131 then, and to 135 now).
- **The "22" claim is deliberately preserved.** It records what `5302839`
  authored, and the consumer-half entry in the same block documents the
  extension to 26 — coherent as a two-entry narrative; "fixing" it to 26 would
  falsify the first entry's own deliverable.
- **External grounding.** research-web: keepachangelog's FAQ sanctions
  correcting existing entries; Common Changelog frames changelog production as
  deliberate curation; GitLab Pages MR !733 is a real-world precedent of
  removing/correcting pre-emptively written entries before release. This
  supports the in-place Unreleased curation approach over appending
  correction-of-a-correction noise.

*Generated: 2026-07-31*
*Approved: 2026-07-31*
*Status: APPROVED*
