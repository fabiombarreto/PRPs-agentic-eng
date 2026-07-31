# Feature: Close the validation-docs debt (description mode)

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting artifact creation (a new `node:test` file under `scripts/validate/checks/`); modification of a contract-bound shared surface (`documentation/`); amendment of a governance record (`docs/context/constraints.md`)
- Decisions found:
  - [2026-07-12] Validation suite: the relay repo declares `test_frameworks: ["node:test"]` with `tdd: false`; the relay `test-writer`/`test-reviewer` pair authors and maintains checker unit tests test-after, and the Implementer authors ZERO test files (R-X strict). This is the decision that forbids planning `feedback-chain.test.mjs` as an Implementer task.
  - [2026-05-06] / [2026-07-10] Test pair universalized: activation is on a declared framework; `tdd:` selects ordering only, never whether the pair runs.
  - [2026-07-30] Writer pre-emission self-checks: items state artifact properties, never the reviewer's rubric wording. This is the contract `feedback-chain`'s `SELF_CHECKS` registry guards and therefore what this plan's tests must pin.
  - [2026-04-30] Plugin manifest version is bumped on every minor/major release cut (`documentation/AGENTS.md` §7.5). Relevant as a NON-trigger here: this change adds no plugin asset and cuts no release, so it lands under `Unreleased` with no `plugin.json` bump.
- Applicable anti-patterns:
  - Weakening or deleting tests to make a run turn green (`docs/anti-patterns.md`) — each assertion class here must be pinned by a fixture that genuinely fails when the guarded property is broken, never a test shaped to pass.
  - Writing tests that mirror the implementation instead of the requirements — the fixtures must exercise the documented contract of `checkFeedbackChain`, not restate its control flow.
  - Treating `plugins/prp-core/` as active relay code — out of scope for every file in this plan.
  - Writing pipeline artifacts under `.claude/` — this plan writes only under `PRPs/plans/`, `scripts/`, `docs/`, and `documentation/`.
- Applicable architectural rules:
  - `documentation/AGENTS.md` §2 invariants: no build step, no bundler, no network dependency, no new CSS or JS file, no inline `<style>`/`style=""`, no emojis, relative paths only.
  - `documentation/AGENTS.md` §9 (modify an existing page): read the full page first, preserve structure, do not rename existing `id` slugs, log the change in `changelog.html`.
  - `documentation/AGENTS.md` §5 CSS vocabulary: reuse existing classes; this plan introduces no new ones.
  - Interactivity boundary: every task here runs autonomously past PRD approval; no task prompts the user.
- Result: PROCEED
```

## Source

Close the validation-docs debt recorded in docs/context/constraints.md lines 96-110. Repo root for ALL reads and writes is the absolute path C:\repos\PRPs-agentic-eng (NOT the session worktree under .claude/worktrees/) — resolve every relative path in this plan against that root. Two deliverables. (1) Author scripts/validate/checks/feedback-chain.test.mjs — node:test, test-after per docs/context/methodology.md (tdd: false, test_frameworks: ["node:test"]), mirroring the shape of the existing scripts/validate/checks/gating-structure.test.mjs: synthetic in-memory fixtures exercising the pure exported checkFeedbackChain({files}) function, plus a real-wrapper test invoking runFeedbackChainCheck() against the real repository tree, plus a registration test asserting scripts/validate/index.mjs imports and registers runFeedbackChainCheck in its CHECKS array. Coverage must reach every assertion class the module actually has: the PAIRS loop (command fails to forward prior_feedback, agent fails to declare it, agent missing its "## Targeted revision mode" section), all three PLAN_WRITER_INVARIANTS (input-declared-in-both-mode-groups, grounding-carve-out-names-all-four-ids, regrounding-anti-pattern-consistent-with-phase-2), the SELF_CHECKS rules (block missing, missing the front-run framing, an item line quoting a rubric token — and the complementary case that a rubric token in surrounding non-item prose is allowed, which is load-bearing for test-writer), the plan-writer self-check-before-write ordering check, the implementer "exactly 2 '### Phase 4.' headings" count, and the test-writer verbatim lifecycle-ledger sentence. Each assertion class needs a fixture that actually fails when the guarded property is broken — mutation-style, not merely observed passing on a green tree. This test file is test-pair work under R-X strict: the Implementer authors ZERO test files (docs/decisions.md [2026-07-12] and [2026-05-06]), so plan it as test-pair authoring, never as an Implementer task. (2) Bring documentation/reference/validation-checks.html up to date: it currently documents 8 checks and its own totals line says eight, while scripts/validate/index.mjs registers 10. Add the two missing per-check sections, gating-structure and feedback-chain, each following that page's existing per-check contract (functionality guarded, a passing example, a failing example carrying the verbatim finding text emitted by the module, and the unit tests covering it), and correct every eight-to-ten totals reference on the page. documentation/AGENTS.md is binding for this file: no build step, no new CSS or JS files, no inline style attributes, no emojis, relative paths only, reuse the existing CSS vocabulary, and the change MUST include an entry in documentation/changelog.html per AGENTS.md section 7.4 and the section 9 modify-an-existing-page checklist. Also update the search-index.json excerpt for that page if its scope description changes. Finally, mark the constraints.md debt item discharged in the same way the feedback-chain debt item above it was discharged (strikethrough plus a dated Discharged note), since that file is the record of this debt.

## Summary

`scripts/validate/index.mjs` registers ten checks and `npm run validate` reports ten PASS, but `documentation/reference/validation-checks.html` documents eight and its own summary table, intro callout, totals line, and search-index excerpt all still say eight. The two undocumented checks are `gating-structure` (shipped v0.23.0) and `feedback-chain` (shipped 2026-07-30). That page's per-check contract requires naming the unit tests covering each check, and `feedback-chain` has none — so the page could not be honestly back-filled without first authoring `scripts/validate/checks/feedback-chain.test.mjs`. This plan closes both halves in the only order the data dependency permits: the test pair authors the missing suite (R-X strict forbids the Implementer touching it), then the Implementer back-fills the two page sections citing real, verifiable test counts, corrects every eight-to-ten reference across the page and the search index, logs the change in `changelog.html`, and strikes the debt item in `docs/context/constraints.md` with a dated discharge note — mirroring exactly how the adjacent `targeted-retry` debt item was discharged on 2026-07-30.

## User Story

As a relay maintainer auditing what `npm run validate` actually guards,
I want the published validation-checks reference to describe all ten registered checks with their real covering unit tests,
So that the reference page is a trustworthy catalog rather than a snapshot two releases stale, and `feedback-chain`'s guarantees are pinned by tests instead of resting on a one-time manual verification.

## Problem Statement

`documentation/reference/validation-checks.html` claims to be the complete per-check catalog of the validation suite. It is not. It documents eight checks; ten are registered and running. A reader consulting it to learn what the suite guards will conclude that the writer-side `prior_feedback` contract and the `figma_track`/`visual_first_approval` gating structure are unguarded, when both are in fact enforced on every commit through the pre-commit hook.

The page was deliberately not back-filled when the guide page and `CLAUDE.md` were corrected to ten on 2026-07-30, for a stated reason recorded in `docs/context/constraints.md`: the page's per-check contract includes naming the unit tests covering the check, and `feedback-chain` has zero. Writing the section then would have either omitted a contract element or claimed coverage that does not exist. That leaves a second, deeper gap — `feedback-chain` guards three invariants that discharged previously-accepted technical debt, and those guarantees currently rest on the check having been observed passing once, with no test proving it fails when the properties it asserts are violated.

## Solution Statement

Author `scripts/validate/checks/feedback-chain.test.mjs` through the test pair, mirroring the established shape of `scripts/validate/checks/gating-structure.test.mjs`: synthetic in-memory fixtures against the pure `checkFeedbackChain({files})` export, a real-wrapper test invoking `runFeedbackChainCheck()` against the actual tree, and a registration test pinning the wiring in `scripts/validate/index.mjs`. Every assertion class in the module gets a fixture that genuinely fails when its guarded property is broken, so the suite is mutation-verified rather than merely green.

With real counts then available, the Implementer adds two per-check sections to `documentation/reference/validation-checks.html` following the page's own four-part contract, corrects the summary table, intro callout, and totals line from eight to ten, updates the search-index excerpt, logs the change under `Unreleased` in `changelog.html`, and strikes the `constraints.md` debt item with a dated discharge note. No new CSS class, no new JS, no new page, no plugin asset, and therefore no `plugin.json` version bump.

## Metadata

| Field | Value |
|-------|-------|
| Type | Documentation + test coverage |
| Complexity | Medium |
| Systems Affected | `scripts/validate/` (test surface only), `documentation/` (reference page, changelog, search index), `docs/context/constraints.md` |
| Dependencies | `scripts/validate/checks/feedback-chain.mjs` and `scripts/validate/index.mjs` already shipped and passing; no new npm dependency |
| Estimated Tasks | 6 Implementer tasks (plus the test suite, authored by the test pair) |
| Source | Free-text description (description mode — no source PRD) |
| `phase_type` | `feature` |

`phase_type: feature` is the accurate value, not `docs`: the `## Files to Change` table below contains `scripts/validate/checks/feedback-chain.test.mjs`, a `.mjs` source file, so the `docs` signal ("only documentation files, no application source files") does not hold. `design_source` and `phase_scope` are absent by rule — `docs/context/methodology.md` declares no `figma_track` key, and description mode has no PRD to declare `visual_first`.

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `scripts/validate/checks/feedback-chain.mjs` | 1-318 | The module under test. Its exports (`checkFeedbackChain`, `runFeedbackChainCheck`, `WATCHED_FILES`), its `PAIRS` / `PLAN_WRITER_INVARIANTS` / `SELF_CHECKS` registries, and its verbatim finding strings are what both the test suite and the page section must reflect. |
| P0 | `scripts/validate/checks/gating-structure.test.mjs` | 1-314 | The shape to mirror: header docblock with traceability, synthetic fixture constant, `withoutLine` mutation helper, per-marker failure tests, a robustness test, a real-wrapper test, and a registration test against `index.mjs`. |
| P0 | `documentation/reference/validation-checks.html` | 26-50, 122-128 | The page being modified. Lines 26-50 hold the intro callout, summary table, and totals line that all say eight; 122-128 is `bootstrap-parity`, the cleanest example of the four-part per-check contract to copy. |
| P0 | `documentation/AGENTS.md` | 31-41, 239-286, 400-406 | Binding contract: §2 invariants, §6 three-file registration, §9 modify-an-existing-page checklist. |
| P1 | `docs/context/constraints.md` | 62-110 | The debt record. Lines 66-81 are the already-discharged sibling item whose strikethrough-plus-dated-note form Task 6 must mirror; 96-110 is the item this plan discharges. |
| P1 | `scripts/validate/index.mjs` | 19-49 | Both halves the registration test asserts: the ten `import` statements (19-28) and the `CHECKS` array from its opening `const CHECKS = [` at 38 through the ten entries and the closing `];` at 49. |
| P1 | `docs/decisions.md` | 710-723 | The [2026-07-12] decision establishing R-X strict for this repo's checker tests — why the suite is test-pair work. |

## Patterns to Mirror

```js
# SOURCE: scripts/validate/checks/gating-structure.test.mjs:124-129
function withoutLine(content, needle) {
  return content
    .split('\n')
    .filter((line) => !line.includes(needle))
    .join('\n');
}
```

The mutation helper. A single "everything present" fixture plus `withoutLine` is what makes each failure test provably a mutation of a passing baseline rather than an independently-authored string that might fail for an unrelated reason. Copied by the test suite (AC-A1 through AC-A5, authored by `test-writer`).

```js
# SOURCE: scripts/validate/checks/gating-structure.test.mjs:144-153
test('checkGatingStructure: fails naming "default-false-emission" when the "Always emit `figma_track: false`" marker is missing', () => {
  const content = withoutLine(ALL_MARKERS_PRESENT, 'Always emit `figma_track: false`');
  const result = checkGatingStructure({ skillContent: content });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /site "figma_track"/);
  assert.match(result.findings[0].message, /"default-false-emission"/);
  assert.equal(result.findings[0].file, SKILL_PATH);
});
```

The per-assertion-class failure test: mutate one property, assert `ok:false`, assert the finding count is exactly one (proving isolation), and assert the message names the specific violated invariant. Copied by the test suite for each of `feedback-chain`'s assertion classes.

```js
# SOURCE: scripts/validate/checks/gating-structure.test.mjs:291-297
test('runGatingStructureCheck: ok:true with zero findings against the real, already-implemented SKILL.md', () => {
  const result = runGatingStructureCheck();

  assert.equal(result.name, 'gating-structure');
  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});
```

The real-wrapper test — the one test that would catch a real regression in the shipped prompt files rather than only in the check logic. Copied by the test suite (AC-A4).

```js
# SOURCE: scripts/validate/checks/gating-structure.test.mjs:307-314
test('scripts/validate/index.mjs imports runGatingStructureCheck and registers it in the CHECKS array', () => {
  const content = readFileSync(resolve(INDEX_PATH), 'utf-8');

  assert.match(content, /import\s*\{\s*runGatingStructureCheck\s*\}\s*from\s*'\.\/checks\/gating-structure\.mjs'/);

  const checksBlock = content.slice(content.indexOf('const CHECKS'), content.indexOf('];', content.indexOf('const CHECKS')) + 2);
  assert.match(checksBlock, /runGatingStructureCheck/);
});
```

The registration test — pins the wiring that makes `npm run validate` actually invoke the check. Copied by the test suite (AC-A5).

```html
# SOURCE: documentation/reference/validation-checks.html:122-128
      <h2 id="bootstrap-parity">bootstrap-parity</h2>

      <p><strong>Functionality.</strong> Reads exactly <code>plugins/relay/skills/context-builder/SKILL.md</code> and enforces Windows parity: ...</p>
      <p><strong>Passes when</strong> both templates are emitted, or neither is, or only <code>.ps1</code> is.</p>
      <p><strong>Fails when</strong> the skill emits <code>.sh</code> with no <code>.ps1</code> sibling:</p>
      <pre><code class="language-default">plugins/relay/skills/context-builder/SKILL.md emits a worktree-bootstrap.sh template but no matching worktree-bootstrap.ps1 template — Windows hosts have no bootstrap script parity</code></pre>
      <p><strong>Unit tests (6).</strong> Both-present passes; neither-present passes; the worked example (<code>.sh</code> without <code>.ps1</code>) is caught; only-<code>.ps1</code> passes (the documented asymmetry); a word-boundary anchor rejects similar-but-different tokens; and missing input fails loud.</p>
```

The four-part per-check contract, in the exact markup the page uses: `<h2 id="...">`, a `<strong>Functionality.</strong>` paragraph, a `<strong>Passes when</strong>` paragraph, a `<strong>Fails when</strong>` paragraph closing with a colon, a `<pre><code class="language-default">` block holding the verbatim finding text, and a `<strong>Unit tests (N).</strong>` paragraph. Copied by Task 1 and Task 2.

```html
# SOURCE: documentation/reference/validation-checks.html:45
          <tr><td><a href="#bootstrap-parity">bootstrap-parity</a></td><td>context-builder emits both <code>.sh</code> and <code>.ps1</code> bootstrap</td><td>6</td></tr>
```

The summary-table row shape (Check / What it verifies / Unit tests). Copied by Task 3.

```html
# SOURCE: documentation/changelog.html:70-79
      <h3 id="v0-23-1-changed">Changed</h3>
      <ul>
        <li><strong><code>docs/context/constraints.md</code></strong> &mdash; "Known TODOs / open planning items" records three items accepted as technical debt during this feature's own plan review: ...</li>
      </ul>
```

The changelog subsection shape: an `<h3 id="<version>-<section>">` using the keepachangelog vocabulary, then a `<ul>` whose every `<li>` opens with the touched path in `<strong><code>`, an `&mdash;` separator, and prose stating what changed and why. HTML entities (`&mdash;`, `&rarr;`) rather than literal characters. Copied by Task 5, with the id prefixed `unreleased-` since no release is being cut.

```markdown
# SOURCE: docs/context/constraints.md:66-81
- ~~**Plan-level verification gaps carried into the `targeted-retry` plan.** Two
  `R-COH-*` findings were accepted rather than resolved: (a)
  `R-COH-AC-UNVERIFIABLE` — AC-A6 ... has no verification path in any task VALIDATE
  or Level block; ...~~
  **Discharged 2026-07-30:** the new `feedback-chain` check in
  `scripts/validate/checks/` converts all three claims into deterministic gates
  (`input-declared-in-both-mode-groups`, ...), so the one-time manual
  verification done at implement time is now a permanent regression gate.
```

The discharge form: the original bullet is wrapped in `~~...~~` from its leading `**` to its final character — never deleted — and a `**Discharged <YYYY-MM-DD>:**` paragraph is appended at the bullet's own indentation, naming concretely what closed the gap. Copied by Task 6.

```json
# SOURCE: documentation/assets/data/search-index.json:116-121
  {
    "title": "Validation checks",
    "path": "reference/validation-checks.html",
    "category": "Reference",
    "excerpt": "Complete per-check catalog of the validation suite: for each of the eight static checks and the eval layer, the functionality guarded, a passing example, a failing example with the verbatim finding text, and the covering unit tests (76 total)."
  },
```

The entry being edited, verbatim as it stands. Only `excerpt` changes — the two stale figures ("eight static checks", "(76 total)") become ten and the recomputed total; `title`, `path`, and `category` are the page's identity and stay byte-identical. Copied by Task 4.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `scripts/validate/checks/feedback-chain.test.mjs` | CREATE | The missing unit-test suite. Authored by `test-writer`/`test-reviewer` under R-X strict — never by the Implementer. Its existence and passing count are preconditions for Tasks 2 and 3. |
| `documentation/reference/validation-checks.html` | UPDATE | Add the `gating-structure` and `feedback-chain` per-check sections (Tasks 1-2); correct the summary table, intro callout, and totals line from eight to ten (Task 3). |
| `documentation/assets/data/search-index.json` | UPDATE | The page's excerpt says "eight static checks" and "(76 total)"; both are stale once the page documents ten. AGENTS.md §6.2. |
| `documentation/changelog.html` | UPDATE | Mandatory per AGENTS.md §7.4 — every change touching `documentation/` gets an entry. Lands under the currently-empty `Unreleased` block. |
| `docs/context/constraints.md` | UPDATE | This file is the record of the debt being discharged. Strike the item and add a dated discharge note, mirroring the sibling item discharged 2026-07-30. |

## NOT Building (Scope Limits)

- **No change to `scripts/validate/checks/feedback-chain.mjs` itself.** The module ships and passes; this plan documents and tests it, never edits it. A test that required changing the module under test would mean the module is wrong, which is a different plan.
- **No new validation check.** `scan-root-lock.mjs` exists in the checks directory but is not registered in `index.mjs`'s `CHECKS` array; whether it should be is out of scope here, and the page correctly documents only registered checks.
- **No `plugin.json` version bump and no release cut.** AGENTS.md §7.5 requires a bump only for a minor/major release cut, or for a patch shipping a plugin asset. This change ships neither — nothing under `plugins/relay/` is touched. The entry lands under `Unreleased`.
- **No new page, no new NAV entry, no new top-level folder.** `reference/validation-checks.html` already exists and is already registered in NAV and the search index; AGENTS.md §9 (modify), not §8 (add), governs.
- **No new CSS class or JS behavior.** Both new sections reuse the existing per-check markup vocabulary verbatim.
- **No reviewer-side or rubric change.** This plan touches no agent file, no rubric item, and no budget.
- **No fix for reviewer non-determinism.** That is the fourth open item in `constraints.md` and stays open — this plan discharges only the `validation-checks.html` item.

## Step-by-Step Tasks

### Task 1: UPDATE `documentation/reference/validation-checks.html` — add the `gating-structure` per-check section

**ACTION**: Delivers the `gating-structure` half of **AC-A6**. Insert a new `<h2 id="gating-structure">gating-structure</h2>` section immediately after the `bootstrap-parity` section (line 128) and before `<h2 id="eval-layer">`, preserving the page's registered-check-then-eval-layer ordering. Populate all four contract parts from `scripts/validate/checks/gating-structure.mjs`: what it guards (the `SITES` registry's three non-heuristic properties — default-value emission, preserve-on-update, backfill-only-when-absent — for each registered gating key, currently `figma_track` and `visual_first_approval`, read from `plugins/relay/skills/context-builder/SKILL.md`); a passing example; a failing example whose `<pre><code class="language-default">` block carries the module's verbatim finding text, copied character-for-character from the source rather than paraphrased; and a `<strong>Unit tests (12).</strong>` sentence summarizing the twelve tests in `gating-structure.test.mjs`. Use only existing CSS classes; no inline styles, no emojis, relative hrefs only.

**MIRROR**: `# SOURCE: documentation/reference/validation-checks.html:122-128` — the four-part per-check contract.

**VALIDATE**:
```bash
set -euo pipefail
html=documentation/reference/validation-checks.html
section=$(tr -d '\r' < "$html" | awk '/<h2 id="gating-structure">/{f=1; print; next} f && /<h2 /{exit} f')
[ -n "$section" ] || { echo "FAIL: no gating-structure section"; exit 1; }
for m in "<strong>Functionality.</strong>" "<strong>Passes when</strong>" "<strong>Fails when</strong>" "<strong>Unit tests (" "<pre><code"; do
  printf '%s' "$section" | grep -qF "$m" || { echo "FAIL: gating-structure section missing $m"; exit 1; }
done
cited=$(printf '%s' "$section" | grep -oE 'Unit tests \([0-9]+\)' | grep -oE '[0-9]+')
actual=$(node --test scripts/validate/checks/gating-structure.test.mjs 2>&1 | grep -E 'tests [0-9]+$' | grep -oE '[0-9]+$' | head -1)
[ "$cited" = "$actual" ] || { echo "FAIL: page cites $cited gating-structure unit tests, suite reports $actual"; exit 1; }
echo "PASS: gating-structure section complete, $actual tests cited correctly"
```

### Task 2: UPDATE `documentation/reference/validation-checks.html` — add the `feedback-chain` per-check section

**ACTION**: Delivers the `feedback-chain` half of **AC-A6**, and is the task that transitively enforces **AC-A1** and **AC-A5** (its VALIDATE runs the suite the test pair authors, so it fails closed if that suite is absent or red). Insert a new `<h2 id="feedback-chain">feedback-chain</h2>` section immediately after the `gating-structure` section from Task 1 and before `<h2 id="eval-layer">`. Populate all four contract parts from `scripts/validate/checks/feedback-chain.mjs`: what it guards (the `PAIRS` end-to-end `prior_feedback` contract, the three `PLAN_WRITER_INVARIANTS` that discharged previously-accepted debt, and the `SELF_CHECKS` pre-emission blocks including the load-bearing item-line-versus-prose split on rubric tokens); a passing example; a failing example whose `<pre><code class="language-default">` block carries verbatim finding strings copied character-for-character from the module source; and a `<strong>Unit tests (N).</strong>` sentence where N is the count the suite actually reports. This task cannot be completed before `scripts/validate/checks/feedback-chain.test.mjs` exists — its VALIDATE reconciles the cited count against a live `node --test` run and fails when the file is absent.

**MIRROR**: `# SOURCE: documentation/reference/validation-checks.html:122-128` — the four-part per-check contract.

**VALIDATE**:
```bash
set -euo pipefail
html=documentation/reference/validation-checks.html
section=$(tr -d '\r' < "$html" | awk '/<h2 id="feedback-chain">/{f=1; print; next} f && /<h2 /{exit} f')
[ -n "$section" ] || { echo "FAIL: no feedback-chain section"; exit 1; }
for m in "<strong>Functionality.</strong>" "<strong>Passes when</strong>" "<strong>Fails when</strong>" "<strong>Unit tests (" "<pre><code"; do
  printf '%s' "$section" | grep -qF "$m" || { echo "FAIL: feedback-chain section missing $m"; exit 1; }
done
cited=$(printf '%s' "$section" | grep -oE 'Unit tests \([0-9]+\)' | grep -oE '[0-9]+')
actual=$(node --test scripts/validate/checks/feedback-chain.test.mjs 2>&1 | grep -E 'tests [0-9]+$' | grep -oE '[0-9]+$' | head -1)
[ -n "$actual" ] || { echo "FAIL: feedback-chain.test.mjs did not report a test count (file absent or crashed)"; exit 1; }
[ "$cited" = "$actual" ] || { echo "FAIL: page cites $cited feedback-chain unit tests, suite reports $actual"; exit 1; }
echo "PASS: feedback-chain section complete, $actual tests cited correctly"
```

### Task 3: UPDATE `documentation/reference/validation-checks.html` — correct every eight-to-ten reference

**ACTION**: Delivers **AC-A7** and contributes the page half of **AC-A11**. Add two `<tr>` rows to the summary table (lines 33-48) for `gating-structure` and `feedback-chain`, each linking to its new anchor and carrying its real unit-test count, positioned to match the runner's execution order so the table reads as the runner runs. Change the intro callout's "runs all eight" (line 28) to "runs all ten". Rewrite the totals line (line 50) so both figures are accurate: the `node:test` unit-test total becomes the current 76 plus the two newly-documented suites' real counts, and "reports 8 checks" becomes "reports 10 checks". Verify the recomputed total against the sum of the summary table's own Unit tests column rather than asserting it by hand.

**MIRROR**: `# SOURCE: documentation/reference/validation-checks.html:45` — the summary-table row shape.

**VALIDATE**:
```bash
set -euo pipefail
html=documentation/reference/validation-checks.html
flat=$(tr -d '\r' < "$html" | tr '\n' ' ' | tr -s ' ')
if printf '%s' "$flat" | grep -qE 'runs all eight|reports 8 checks'; then
  echo "FAIL: a stale eight-check claim survives on the page"; exit 1
fi
printf '%s' "$flat" | grep -qE 'runs all ten'
printf '%s' "$flat" | grep -qE 'reports 10 checks'
for id in gating-structure feedback-chain; do
  printf '%s' "$flat" | grep -qF "<a href=\"#$id\">$id</a>" || { echo "FAIL: summary table has no row for $id"; exit 1; }
done
sum=$(tr -d '\r' < "$html" | awk '/<tbody>/{f=1} /<\/tbody>/{f=0} f' | grep -oE '<td>[0-9]+</td>' | grep -oE '[0-9]+' | awk '{s+=$1} END {print s}')
stated=$(printf '%s' "$flat" | grep -oE 'Totals:</strong> [0-9]+' | grep -oE '[0-9]+')
[ "$sum" = "$stated" ] || { echo "FAIL: totals line states $stated unit tests, summary table column sums to $sum"; exit 1; }
echo "PASS: page reports ten checks, totals reconcile to $sum"
```

### Task 4: UPDATE `documentation/assets/data/search-index.json` — refresh the page excerpt

**ACTION**: Delivers **AC-A8**. Update the `excerpt` of the entry whose `path` is `reference/validation-checks.html` so it says "ten static checks" instead of "eight static checks" and carries the recomputed unit-test total instead of "(76 total)". Leave `title`, `path`, and `category` untouched — the page is not being renamed or recategorized, and AGENTS.md §9 forbids changing an existing page's identity. Keep the excerpt within the 15-35 word guidance of AGENTS.md §6.2.

**MIRROR**: `# SOURCE: documentation/assets/data/search-index.json:116-121` — the entry being edited, with `title` / `path` / `category` held byte-identical.

**VALIDATE**:
```bash
set -euo pipefail
node -e '
const { readFileSync } = require("fs");
const idx = JSON.parse(readFileSync("documentation/assets/data/search-index.json", "utf8"));
const e = idx.find((x) => x.path === "reference/validation-checks.html");
if (!e) { console.error("FAIL: no search-index entry for the page"); process.exit(1); }
if (/eight static checks/.test(e.excerpt)) { console.error("FAIL: excerpt still says eight static checks"); process.exit(1); }
if (!/ten static checks/.test(e.excerpt)) { console.error("FAIL: excerpt does not say ten static checks"); process.exit(1); }
if (e.title !== "Validation checks" || e.category !== "Reference") { console.error("FAIL: entry identity changed"); process.exit(1); }
const html = readFileSync("documentation/reference/validation-checks.html", "utf8");
const stated = (html.replace(/\r/g, "").match(/Totals:<\/strong> (\d+)/) || [])[1];
const inExcerpt = (e.excerpt.match(/(\d+)\s+total/) || [])[1];
if (!stated || !inExcerpt || stated !== inExcerpt) { console.error(`FAIL: excerpt total ${inExcerpt} disagrees with page totals ${stated}`); process.exit(1); }
console.log("PASS: excerpt reconciles with the page");
'
```

### Task 5: UPDATE `documentation/changelog.html` — log the change under `Unreleased`

**ACTION**: Delivers **AC-A9**. Add a `<h3>` subsection under the existing empty `<h2 id="unreleased">Unreleased</h2>` block using the keepachangelog vocabulary from AGENTS.md §7.2 — `Fixed` is the correct section, since this corrects a page that under-reported the suite. The entry must name `reference/validation-checks.html`, state that it now documents all ten registered checks, and mention the new `feedback-chain` unit-test suite. Do not cut a release, do not rename `Unreleased`, and do not bump `plugins/relay/.claude-plugin/plugin.json` — no plugin asset is touched, so AGENTS.md §7.5's bump rule does not fire. No emojis, per AGENTS.md §2.5.

**MIRROR**: `# SOURCE: documentation/changelog.html:70-79` — the changelog subsection shape.

**VALIDATE**:
```bash
set -euo pipefail
flat=$(tr -d '\r' < documentation/changelog.html | tr '\n' ' ' | tr -s ' ')
unrel=$(printf '%s' "$flat" | sed 's/.*<h2 id="unreleased">Unreleased<\/h2>//' | sed 's/<h2 id="v0-24-0">.*//' | sed 's/^ *//; s/ *$//')
[ -n "$unrel" ] || { echo "FAIL: Unreleased block is empty"; exit 1; }
printf '%s' "$unrel" | grep -qF 'reference/validation-checks.html' || { echo "FAIL: Unreleased entry does not name the page"; exit 1; }
printf '%s' "$unrel" | grep -qF 'feedback-chain' || { echo "FAIL: Unreleased entry does not mention feedback-chain"; exit 1; }
if printf '%s' "$flat" | grep -qE '<h2 id="unreleased">Unreleased</h2> <h2'; then
  echo "FAIL: Unreleased block still directly abuts the next release heading"; exit 1
fi
grep -q '"version": "0.24.0"' plugins/relay/.claude-plugin/plugin.json || { echo "FAIL: plugin.json version changed; this change ships no plugin asset"; exit 1; }
echo "PASS: changelog entry recorded under Unreleased, no release cut"
```

### Task 6: UPDATE `docs/context/constraints.md` — mark the debt discharged

**ACTION**: Delivers **AC-A10**. Strike through the `**`reference/validation-checks.html` is two checks behind.**` bullet (lines 96-110) with `~~...~~` and append a `**Discharged 2026-07-31:**` note beneath it, mirroring exactly the form used by the sibling item discharged on 2026-07-30 at lines 66-81. The note must state what closed the gap: `feedback-chain.test.mjs` authored through the test pair, both per-check sections added, and the page's totals corrected to ten. Do not delete the original text — the strikethrough-plus-note form preserves the record of what the debt was, which is the whole point of the file.

**MIRROR**: `# SOURCE: docs/context/constraints.md:66-81` — the strikethrough-plus-dated-note discharge form.

**VALIDATE**:
```bash
set -euo pipefail
flat=$(tr -d '\r' < docs/context/constraints.md | tr '\n' ' ' | tr -s ' ')
printf '%s' "$flat" | grep -qF '~~**`reference/validation-checks.html` is two checks behind.**' || { echo "FAIL: debt item is not struck through"; exit 1; }
printf '%s' "$flat" | grep -qF '**Discharged 2026-07-31:**' || { echo "FAIL: no dated discharge note"; exit 1; }
printf '%s' "$flat" | grep -qF 'Reviewer non-determinism across attempts.' || { echo "FAIL: the still-open reviewer-non-determinism item was damaged"; exit 1; }
if printf '%s' "$flat" | grep -qE '~~\*\*Reviewer non-determinism'; then
  echo "FAIL: the still-open reviewer-non-determinism item was wrongly struck through"; exit 1
fi
echo "PASS: debt discharged, adjacent open item intact"
```

## Validation Commands

### Level 1 — STATIC_ANALYSIS

```bash
set -euo pipefail
node --check scripts/validate/checks/feedback-chain.test.mjs
node -e 'JSON.parse(require("fs").readFileSync("documentation/assets/data/search-index.json","utf8")); console.log("search-index.json parses");'
node -e '
const { readFileSync } = require("fs");
for (const f of ["documentation/reference/validation-checks.html", "documentation/changelog.html"]) {
  const s = readFileSync(f, "utf8");
  if (/<style[\s>]/.test(s)) { console.error(`FAIL: ${f} contains an inline <style> block`); process.exit(1); }
  if (/\sstyle="/.test(s)) { console.error(`FAIL: ${f} contains an inline style attribute`); process.exit(1); }
  if (/href="\/documentation\//.test(s)) { console.error(`FAIL: ${f} contains an absolute documentation path`); process.exit(1); }
  if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(s)) { console.error(`FAIL: ${f} contains an emoji`); process.exit(1); }
}
console.log("AGENTS.md section 2 invariants hold");
'
```

### Level 2 — UNIT_TESTS

```bash
set -euo pipefail
node --test scripts/validate/checks/feedback-chain.test.mjs
node --test scripts/validate/checks/gating-structure.test.mjs
```

Both suites must exit 0. `node --test` exits non-zero on any failing test, so the tool's own status propagates and `set -e` fails the block. The glob-free single-file form is used deliberately: passing a directory to `node --test` triggers a `MODULE_NOT_FOUND` resolution failure in this repo.

### Level 3 — INTEGRATION

```bash
set -euo pipefail
npm run validate
node -e '
const { readFileSync } = require("fs");
const html = readFileSync("documentation/reference/validation-checks.html", "utf8").replace(/\r/g, "");
const index = readFileSync("scripts/validate/index.mjs", "utf8");
const registered = (index.slice(index.indexOf("const CHECKS"), index.indexOf("];", index.indexOf("const CHECKS"))).match(/run\w+Check/g) || []).length;
const documented = (html.match(/<h2 id="[a-z-]+">(?!The eval)/g) || []).filter((h) => !/id="summary"|id="eval-layer"/.test(h)).length;
if (registered !== documented) {
  console.error(`FAIL: index.mjs registers ${registered} checks but the page documents ${documented}`);
  process.exit(1);
}
console.log(`PASS: ${registered} registered checks, ${documented} documented`);
'
```

`npm run validate` must report `10 passed, 0 failed`; it exits non-zero on any failing check. The Node block then independently reconciles the count of registered checks in `index.mjs` against the count of per-check `<h2>` sections on the page, so the page cannot silently fall behind again without this level failing.

## Acceptance Criteria

R8b (PRD AC-N token check) does not apply in description mode — this plan has no source PRD, so no acceptance criterion carries a `(PRD AC-N)` reference.

- **AC-A1:** `scripts/validate/checks/feedback-chain.test.mjs` exists and exits 0 under `node --test`, exercising the pure `checkFeedbackChain({ files })` export with synthetic in-memory fixtures rather than by mutating real repository files.
- **AC-A2:** The suite covers every assertion class the module implements: each of the three `PAIRS` failure modes (command does not forward `prior_feedback`, agent does not declare it, agent has no `## Targeted revision mode` section); each of the three `PLAN_WRITER_INVARIANTS` (`input-declared-in-both-mode-groups`, `grounding-carve-out-names-all-four-ids`, `regrounding-anti-pattern-consistent-with-phase-2`); each `SELF_CHECKS` rule (block absent, front-run framing absent, an item line quoting a rubric token); the `plan-writer` self-check-before-write ordering guard; the `implementer` exactly-two-`### Phase 4.`-headings count; and the `test-writer` verbatim lifecycle-ledger sentence.
- **AC-A3:** Each assertion class is pinned by a fixture that genuinely fails when the guarded property is broken — a mutation of a passing baseline, asserting `ok:false` and a finding message naming the specific violated invariant, never a test that would pass against a stubbed-out check.
- **AC-A4:** The suite includes a test that a rubric token appearing in a self-check's surrounding non-item prose is permitted, not flagged — the property that keeps `test-writer`'s required closing parenthetical legal, and the one that a naive whole-block prohibition would break.
- **AC-A5:** The suite includes a real-wrapper test invoking `runFeedbackChainCheck()` against the actual repository tree and asserting `ok:true` with zero findings, plus a registration test asserting `scripts/validate/index.mjs` both imports `runFeedbackChainCheck` and lists it in the `CHECKS` array.
- **AC-A6:** `documentation/reference/validation-checks.html` contains a `gating-structure` section and a `feedback-chain` section, each carrying all four parts of the page's per-check contract, with every finding string in the failing example copied verbatim from the check source rather than paraphrased.
- **AC-A7:** Every eight-to-ten reference on the page is corrected — the intro callout, the summary table (two new rows), and the totals line — and the stated unit-test total equals the sum of the summary table's own Unit tests column.
- **AC-A8:** The `reference/validation-checks.html` entry in `documentation/assets/data/search-index.json` describes ten static checks and carries a unit-test total agreeing with the page, with its `title`, `path`, and `category` unchanged.
- **AC-A9:** `documentation/changelog.html` carries an entry under `Unreleased` naming the page and the new `feedback-chain` suite, with no release cut and no `plugins/relay/.claude-plugin/plugin.json` version change.
- **AC-A10:** The `reference/validation-checks.html` debt item in `docs/context/constraints.md` is struck through and followed by a dated `**Discharged 2026-07-31:**` note, while the adjacent still-open reviewer-non-determinism item is left intact and unstruck.
- **AC-A11:** `npm run validate` reports `10 passed, 0 failed`, and an independent reconciliation confirms the number of checks registered in `index.mjs` equals the number of per-check sections on the page.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| The Implementer authors `feedback-chain.test.mjs` directly, violating R-X strict and drawing a blanket `R-X` straight-fail at code review | Medium | High — the whole diff is rejected, not just the test file | The file is marked test-pair-authored in `## Files to Change`, no task's ACTION creates it, and Tasks 2-3 consume it only by running it. Sequencing is stated explicitly in `## Notes`. |
| Cited unit-test counts drift from the suites' real counts | Medium | Medium — the page makes a false coverage claim, which is the exact defect this plan exists to fix | Tasks 1 and 2 reconcile the cited count against a live `node --test` run; Task 3 reconciles the totals line against the summary table's own column; Task 4 reconciles the excerpt against the page. |
| Finding strings in the failing examples are paraphrased rather than copied verbatim, so the page does not match what a developer actually sees | Medium | Medium — silently erodes the page's stated contract | `feedback-chain.mjs` is P0 Mandatory Reading; the per-check contract's verbatim requirement is restated in both Task 1 and Task 2 ACTION lines. |
| Task 6 damages the adjacent still-open reviewer-non-determinism item while editing the debt list | Low | Medium — an open problem silently reads as closed | Task 6's VALIDATE asserts that item is still present AND still unstruck, failing in both directions. |
| The new page sections accumulate the same staleness again after the next check ships | Medium | Low | Level 3 reconciles registered checks against documented sections, so the next unregistered-but-undocumented check fails validation rather than passing quietly. |
| `research-codebase` / `research-web` returned no findings — grounding was performed by direct reads instead | n/a | Low | Documented in `## Notes`; every `# SOURCE:` anchor in `## Patterns to Mirror` cites a real, verified `file:line` in this repository, and each was read in full before being cited. |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.

**Ordering deviation, and why it is not a methodology change.** `tdd: false` selects test-after ordering, and this plan deliberately runs the test pair FIRST. The reason is a data dependency, not a change of methodology: Tasks 2 and 3 cite `feedback-chain`'s unit-test count on a published page, and a count cannot be cited before the suite exists. `docs/context/constraints.md` records the same conclusion in the debt item itself ("Write the tests first, then both reference sections"). The `tdd:` value is untouched, no methodology key is flipped, and the test pair remains the sole author of the test file. Concretely: run `/relay-write-test` and `/relay-test-write-review` on this plan before `/relay-implement`. Tasks 2 and 3 fail closed if that ordering is not respected — their VALIDATE blocks invoke the suite directly.

**Grounding was performed by direct reads, not research subagents.** Phase 2 GROUNDING dispatched neither `research-codebase` nor `research-web`. This work is entirely internal to this repository and has no external-pattern component, so `research-web` would return a `degradation_reason` by construction; and the two files the plan mirrors were read end-to-end before authoring, which is strictly better grounding than a bounded search would produce. Every `# SOURCE:` anchor in `## Patterns to Mirror` names a real `file:line` verified against the tree at commit `a2714f1`.

**Every VALIDATE command in this plan was executed against the unmodified tree before the plan was written.** Tasks 1 through 6 each exit non-zero today. The Task 1 section-slicer was additionally verified in the positive direction against three existing sections (`bootstrap-parity`, `artifact-naming`, `version-parity`), where it exits 0 — so it is a real gate, not an always-fail grep. The tree uses CRLF line terminators, so every command that matches a phrase spanning a line break normalizes with `tr -d '\r' | tr '\n' ' ' | tr -s ' '` first.

**`scan-root-lock.mjs` is intentionally not documented.** It exists under `scripts/validate/checks/` but is absent from `index.mjs`'s `CHECKS` array, so `npm run validate` never runs it. The page documents registered checks; adding a section for an unregistered module would restate the same class of inaccuracy this plan removes. Whether it should be registered is a separate question, left open.

**No plugin asset is touched, so no version bump is due.** AGENTS.md §7.5 requires a `plugin.json` bump on a minor/major release cut, or on a patch shipping something under `plugins/relay/`. This change ships neither — the diff is confined to `scripts/validate/`, `documentation/`, and `docs/`. Task 5's VALIDATE asserts `plugin.json` still reads `0.24.0`.

**Dogfood value.** Running this plan through `/relay-plan-review`, `/relay-write-test`, `/relay-test-write-review`, `/relay-implement`, and `/relay-code-review` produces the first pipeline artifacts recorded after the `v0.24.0` efficiency marker (`PRPs/reports/efficiency/v0.24.0.json`, `2026-07-31T14:19:41Z`). Those verdicts are the sample the wave-2 evaluation currently lacks — at the time this plan was authored, `node scripts/efficiency.mjs compare` reported zero artifacts since the marker, which blocks both the wave-2 revert decision and the wave-3 go/no-go.

*Generated: 2026-07-31*
*Approved: 2026-07-31*
*Status: IMPLEMENTED*
