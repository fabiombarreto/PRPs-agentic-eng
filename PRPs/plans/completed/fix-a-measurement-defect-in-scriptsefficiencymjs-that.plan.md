# Feature: Split review sessions in the efficiency metric (description mode)

```
**Decision Gate**
- Active context: none
- Activated criteria: modification of the measurement tool the entire efficiency initiative is steered by; amendment of two governance records (`docs/context/constraints.md`, `docs/decisions.md`); a change to a file registered in another check's CONSUMERS contract
- Decisions found:
  - [2026-07-12] Validation suite: this repo declares `test_frameworks: ["node:test"]` with `tdd: false`; checker and script unit tests come from the test pair and the Implementer authors ZERO test files (R-X strict). `scripts/efficiency.test.mjs` is therefore out of Implementer scope.
  - [2026-08-05] The `timestamp_degraded` exclusion policy: an artifact carrying any degraded entry is excluded from BOTH sides of a marker comparison, reported through its own named warning. This plan preserves that behavior unchanged — it changes how entries are GROUPED, never which artifacts are excluded.
  - [2026-08-05] The provenance discipline established two entries above: every figure asserted in a Decision paragraph must first appear in that entry's own Context paragraph, and cross-project figures must carry an explicit note that this repo cannot reproduce them. That rule was written after two consecutive rejections for violating it; this plan follows it from the start.
  - [2026-04-30] Plugin manifest lock-step (`documentation/AGENTS.md` §7.5). Relevant as a NON-trigger: nothing here lives under `plugins/relay/`, so `plugin.json` stays at `0.28.1`.
- Applicable anti-patterns:
  - Weakening a gate to make a check stop firing (`docs/anti-patterns.md`) — `timestamp-contract` registers `scripts/efficiency.mjs` in its CONSUMERS array; the degraded-flag consumer code must survive on its merits, never by relaxing the check.
  - Writing pipeline artifacts under `.claude/` — this plan writes only under `PRPs/plans/`, `scripts/`, `docs/`, and `documentation/`.
  - Treating `plugins/prp-core/` as active relay code — untouched here.
- Applicable architectural rules:
  - `scripts/efficiency.mjs`'s own stated philosophy: surface doubt rather than manufacture a clean number. It already prints a small-sample caution, a date-only-boundary warning, and a degraded-exclusion warning; a silent regrouping would break that discipline.
  - `documentation/AGENTS.md` §2 invariants and §7.4 (every `documentation/` change carries a changelog entry).
- Result: PROCEED
```

## Source

Fix a measurement defect in scripts/efficiency.mjs that inflates the rework metric the whole efficiency initiative is steered by, and correct two governance records the corpus now contradicts. Repo root for ALL reads and writes is the absolute path C:\repos\PRPs-agentic-eng — resolve every relative path against that root. THE DEFECT, measured 2026-08-05 over 640 review runs across six repositories (this one plus C:\repos\inplay, C:\repos\assistente-pessoal, C:\repos\super-ensino\spe-cms, C:\repos\super-ensino\spe-services, C:\repos\super-ensino\spe-interaction-services): readCorpus() in scripts/efficiency.mjs groups review verdicts by FILE (see the artifacts.push call around line 91, which pushes one artifact per jsonl file), but a single jsonl file can hold several INDEPENDENT review sessions. Test-write-review files are named per FEATURE rather than per PHASE, so a multi-phase feature appends every phase's reviews to one file. The tell is logically conclusive and needs no filename heuristic: inside one retry loop only the LAST verdict can be APPROVED, because an APPROVED terminates the loop, so a file containing two or more APPROVED verdicts necessarily holds two or more independent sessions. 34 of 376 artifacts (9.0%) are in that state; the worst observed is PRPs/plans/figma-implementation-track.test-write-review.jsonl with 11 entries of which 7 are APPROVED. Consequence: runs-per-artifact overstates rework everywhere, and badly for one stage — test-write-review 2.38 measured per file versus 1.25 per session, plan-review 1.79 versus 1.67, code-review 1.49 versus 1.37. This inverts a founding claim of the initiative: the original diagnosis called test-write-review the worst stage at 3.50 runs per artifact when corrected it is the best. First-attempt failure rate is only mildly affected (code-review 28.5 to 29.4, plan-review 50.8 to 49.5, test-write-review 26.5 to 21.5 percent) because a file's first entry usually IS a genuine first attempt. DELIVERABLE 1: make scripts/efficiency.mjs split each artifact's entries into review SESSIONS at every APPROVED boundary — a session ends at an APPROVED verdict and a new one begins with the following entry; a trailing run of entries with no APPROVED is itself an unresolved session. Report runs per session as the rework metric, and surface how many artifacts were split and into how many sessions, so the correction is visible rather than silent — the tool's existing philosophy already prints a small-sample caution, a date-only-boundary warning, and a timestamp_degraded exclusion warning rather than manufacturing a clean number. Keep first-attempt failure computed per session (the first entry of each session), not per file. Preserve every existing behavior: the PASSING set treats both APPROVED and RUBRIC_PASSED as passing, and any artifact carrying a timestamp_degraded entry is still excluded from both sides of a marker comparison. CRITICAL COUPLING: scripts/validate/checks/timestamp-contract.mjs registers scripts/efficiency.mjs in a CONSUMERS array and asserts it reads and honors the timestamp_degraded flag in executable code. Do not remove or restructure that consumer code, or npm run validate goes red. DELIVERABLE 2: correct docs/context/constraints.md's Reviewer non-determinism across attempts item. It generalizes from a single session's observation, and the corpus does not support it: across 204 consecutive attempt pairs, 75.0 percent of retries RESOLVE the failure, only 9.9 percent of second-attempt failures are regressions where an item passed in one attempt and failed in the next, only 9.8 percent of pairs fail a fully disjoint set, and only 5.4 percent fail the identical set. The metric is sound — all 640 runs record passed:true rows, median rubric array 13 items, so pass sets are populated and regressions are detectable. Rewrite the item to record what was measured rather than deleting it: the phenomenon is real but small, it is not a major efficiency problem, and the two candidate fixes it names (deterministic K=5 ordering, carrying prior-attempt findings forward) are not justified by this evidence. Name honestly what the measurement cannot separate: the writer legitimately changes the plan between attempts, so a newly-failing item may be genuinely newly-introduced rather than reviewer drift. DELIVERABLE 3: record in docs/decisions.md the measurement defect, the session-splitting correction, the corrected per-stage figures, and the explicit consequence that any earlier claim resting on runs-per-artifact — including the test-write-review-is-worst framing in the initiative's founding diagnosis — is superseded. Cite the provenance the same way the 2026-08-05 entry already does: the aggregation ran over the PRPs/plans jsonl corpora of six repositories, five of which live OUTSIDE this repository, so scripts/efficiency.mjs cannot reproduce the cross-project figures; the single-repo figures in this deliverable ARE reproducible here after the fix. Every figure asserted in the Decision paragraph must first appear in the entry's own Context paragraph — that exact defect caused two consecutive code-review rejections on the immediately preceding change, so anchor them from the start. Any change to scripts/efficiency.test.mjs, which currently holds 12 passing tests, is test-pair work under R-X strict — the Implementer authors zero test files per docs/decisions.md 2026-07-12 and 2026-05-06 — so plan it as test-pair authoring, never as an Implementer task, and note that documentation/reference/validation-checks.html's efficiency-metrics section cites a Unit tests count that must be reconciled if the count changes. Nothing here lives under plugins/relay/, so no plugin.json bump is due, but any documentation change needs a changelog.html entry per documentation/AGENTS.md section 7.4. Note for scoping: the corpus baseline is 522 tests, 521 pass, 1 pre-existing failure in figma-visual-first-track-phase6.test.mjs from commit 09ad56b, unrelated to this work, so a whole-corpus zero-failure gate would inherit it.

## Summary

`scripts/efficiency.mjs` treats one jsonl file as one artifact. That assumption is wrong for 9.0% of the corpus, because test-write-review files are named per feature rather than per phase and therefore accumulate every phase's reviews. The result is that the tool's headline rework metric — runs per artifact — counts independent review sessions as retries of one another.

The detection needs no filename heuristic and no guessing: inside a retry loop only the last verdict can be APPROVED, since an APPROVED terminates the loop. A file holding two or more APPROVED verdicts therefore holds two or more independent sessions, necessarily. This plan splits each artifact's entries at every APPROVED boundary, computes rework per session, and surfaces how many artifacts were split so the correction is visible rather than silent — matching the tool's existing habit of printing its own doubts.

It then corrects two governance records: the reviewer-non-determinism item, which generalized from one session's observation that the corpus does not support, and `docs/decisions.md`, which must record that any earlier claim resting on runs-per-artifact is superseded — including the founding diagnosis's framing of test-write-review as the worst stage, which the correction inverts.

## User Story

As someone steering an efficiency initiative by a single rework number,
I want that number to count retries rather than unrelated review sessions that happen to share a log file,
So that decisions about which pipeline stage to fix rest on what the pipeline actually did, and so a stage that barely reworks stops being blamed for the worst rework in the system.

## Problem Statement

Every decision in this initiative has been steered by runs per artifact. `readCorpus()` builds one artifact per jsonl file, and `aggregate()` divides total entries by artifact count. For a phase-level file that is correct — the entries genuinely are retries of one review. For a feature-level file spanning several phases it is not: entries from phase 3's review are counted as retries of phase 1's.

The distortion is not uniform, which is what makes it dangerous. It lands hardest on exactly the stage whose files are feature-named. Measured across six repositories: test-write-review reports 2.38 runs per artifact but 1.25 per session, a 47% overstatement; plan-review 1.79 versus 1.67; code-review 1.49 versus 1.37.

That inverts a founding claim. The initiative's original diagnosis identified test-write-review as the worst stage at 3.50 runs per artifact and treated it as a rework problem. Corrected, it is the best-behaved stage in the pipeline — the test pair barely reworks at all. Work has been prioritized against a number that pointed the wrong way.

Separately, `docs/context/constraints.md` records reviewer non-determinism as a fourth efficiency problem on the strength of one session in which `plan-reviewer` surfaced disjoint defect classes twice. The corpus does not support that generalization, and leaving it unqualified invites someone to spend a wave on it.

## Solution Statement

Introduce a session as the unit of rework. Split each artifact's entries at every APPROVED boundary: a session ends at an APPROVED verdict, the next entry begins a new one, and a trailing run with no APPROVED is itself an unresolved session. Report runs per session, compute first-attempt failure from each session's first entry, and print how many artifacts were split and into how many sessions.

Nothing else about the tool changes. The `PASSING` set still treats `APPROVED` and `RUBRIC_PASSED` alike, and the degraded-timestamp exclusion still removes an affected artifact from both sides of a comparison — this plan changes how entries are grouped, never which artifacts participate. That distinction matters mechanically as well as conceptually: `timestamp-contract` registers this file in a CONSUMERS array and asserts the degraded-flag consumer code exists in executable form.

Both governance records are then corrected with the measurement rather than with an opinion, including what the measurement cannot establish.

## Metadata

| Field | Value |
|-------|-------|
| Type | Measurement correction + governance record amendment |
| Complexity | Medium — one pure-function change with a wide blast radius on reported numbers |
| Systems Affected | `scripts/efficiency.mjs` (behavior), `docs/context/constraints.md` and `docs/decisions.md` (records), `documentation/` (changelog, and the reference page if the test count moves) |
| Dependencies | `scripts/efficiency.test.mjs` currently holds 12 passing tests; `npm run validate` reports 12/12; `timestamp-contract`'s CONSUMERS registry pins this file |
| Estimated Tasks | 5 Implementer tasks; the test suite is test-pair work (see `## NOT Building`) |
| Source | Free-text description (description mode — no source PRD) |
| `phase_type` | `feature` |

`phase_type: feature` rather than `docs`: the `## Files to Change` table contains `scripts/efficiency.mjs`, application source, so the `docs`-only signal does not hold. `design_source` and `phase_scope` are absent by rule — `docs/context/methodology.md` declares no `figma_track` key, and description mode has no PRD to declare `visual_first`.

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `scripts/efficiency.mjs` | 59-94 | The defect site: `PASSING` at 59 (which the session boundary must reuse, not re-derive), and `readCorpus()` at 65-94 whose `artifacts.push` at 91 creates one artifact per file. |
| P0 | `scripts/efficiency.mjs` | 100-133 | `aggregate()`, where `runs` sums `a.entries.length` and `runsPerArtifact` divides by `group.length` — the two lines that must become session-based. |
| P0 | `scripts/efficiency.mjs` | 134-151 | `hasDegradedTimestamp` and `classifyArtifacts` — the exclusion path that must keep operating on whole artifacts, not sessions, so the degraded policy is unchanged. |
| P0 | `scripts/efficiency.mjs` | 198-245 | `doCompare()`'s output surface, including the existing degraded-exclusion warning at 238-244 whose shape the new split-count notice should mirror. |
| P1 | `scripts/validate/checks/timestamp-contract.mjs` | 53-63, 127-130 | The CONSUMERS contract: why this file is watched and what it asserts. Breaking the degraded consumer code turns `npm run validate` red. |
| P1 | `docs/context/constraints.md` | 83-94 | The reviewer-non-determinism item being rewritten, in full. |
| P1 | `docs/decisions.md` | 1699-1733 | The `[2026-08-05]` entry immediately above the one this plan adds — the shape to mirror, including its Context-first figure discipline and its cross-project provenance sentence at 1723. |

## Patterns to Mirror

```javascript
# SOURCE: scripts/efficiency.mjs:59
const PASSING = new Set(['APPROVED', 'RUBRIC_PASSED']);
```

The single source of truth for what counts as a passing verdict. The session boundary must be defined in terms of this set rather than a literal `'APPROVED'` comparison, so `RUBRIC_PASSED` — which `prd-reviewer` emits in subagent mode — closes a session too. Consulted by Task 1.

```javascript
# SOURCE: scripts/efficiency.mjs:91
    if (entries.length) artifacts.push({ stage: STAGES[suffix], file: name, entries });
```

The defect site: one artifact per file. Task 1 keeps this shape — the artifact remains the unit of degraded-exclusion and marker-classification — and adds a derived session partition alongside it rather than replacing it.

```javascript
# SOURCE: scripts/efficiency.mjs:134
export const hasDegradedTimestamp = (a) => a.entries.some((e) => e.degraded);
```

The degraded predicate, exported and operating on a whole artifact. It must keep operating on artifacts after the change — an artifact with a degraded entry is excluded entirely, not per-session — which is the property `timestamp-contract`'s CONSUMERS registry pins. Consulted by Task 1.

```javascript
# SOURCE: scripts/efficiency.mjs:238
  if (degraded.length) {
```

The existing "surface doubt" idiom: a conditional block that prints a named warning and enumerates the affected files rather than adjusting a number silently. Task 2's split-count notice mirrors this shape.

```html
# SOURCE: documentation/reference/validation-checks.html:173
      <h2 id="efficiency-metrics">efficiency-metrics (scripts/efficiency.test.mjs)</h2>
```

The section Task 3 reconciles, and the page's four-part per-check contract it sits inside: a `<strong>Functionality.</strong>` paragraph, a `<strong>Passes when</strong>`, a `<strong>Fails when</strong>`, and a `<strong>Unit tests (N).</strong>` whose N must match what the suite reports. Only that count and the summary-table row change; the prose describing the classifier stays accurate.

```markdown
# SOURCE: docs/context/constraints.md:83
- **Reviewer non-determinism across attempts.** `plan-reviewer` surfaced two
```

The open-item shape in that section — bolded title, then evidence in plain prose. Task 4 rewrites this item in place, preserving the shape.

```markdown
# SOURCE: docs/decisions.md:1723
by a one-off script over the `PRPs/plans/*.jsonl` corpora of all
```

The cross-project provenance sentence established one entry earlier, written precisely so a future reader does not try and fail to re-derive the figures here. Task 5 mirrors it, with the important distinction that this plan's single-repo figures ARE reproducible after the fix.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `scripts/efficiency.mjs` | UPDATE | The defect: session splitting, session-based rework and first-attempt metrics, and the split-count notice. |
| `scripts/efficiency.test.mjs` | UPDATE | Coverage for the new session partition and the preserved degraded/PASSING behavior. Authored by the test pair under R-X strict — never by the Implementer. |
| `docs/context/constraints.md` | UPDATE | Rewrite the reviewer-non-determinism item with what the corpus actually shows. |
| `docs/decisions.md` | UPDATE | Record the defect, the correction, the corrected figures, and what they supersede. |
| `documentation/changelog.html` | UPDATE | Mandatory per AGENTS.md §7.4; the `Unreleased` block currently reads "No changes queued yet." |
| `documentation/reference/validation-checks.html` | UPDATE | Its `efficiency-metrics` section cites a unit-test count that must be reconciled if the suite grows, and the totals line and summary-table column depend on it. |

## NOT Building (Scope Limits)

- **No renaming of the jsonl artifact convention.** Making test-write-review files phase-named would fix the root cause at the source, but it is a change to the writer/reviewer commands under `plugins/relay/`, it would orphan every historic file, and it would need its own version bump and migration story. The measurement fix is correct on its own and works on the existing corpus, including files already written.
- **No change to the degraded-timestamp exclusion policy.** An artifact carrying any degraded entry stays excluded from both sides. This plan changes grouping, not participation, and `timestamp-contract`'s CONSUMERS registry pins the consumer code that implements it.
- **No re-recording of the efficiency markers.** `PRPs/reports/efficiency/v0.24.0.json` and `v0.25.0.json` hold per-file figures snapshotted before this fix. They stay as written — a marker records what was measured at the time, and rewriting one would destroy the audit trail. The honesty guard already warns when a recomputed BEFORE does not match a snapshot, and after this change it legitimately will; the decisions entry records why.
- **No revisiting of the wave-2 decision.** That decision rested on first-attempt failure rates, which this correction moves by at most 4.9 points, not on runs per artifact. It is untouched here.
- **No fix for the pre-existing corpus failure.** `figma-visual-first-track-phase6.test.mjs` has one assertion red on the unmodified tree, from commit `09ad56b` rewriting a phrase in `relay-execute.md` that the test still greps for. Unrelated, test-pair work, and out of scope; Level 2 is scoped so it neither masks nor inherits it.
- **No new plugin version.** Nothing under `plugins/relay/` is touched, so AGENTS.md §7.5's bump rule does not fire and `plugin.json` stays at `0.28.1`.

## Step-by-Step Tasks

### Task 1: UPDATE `scripts/efficiency.mjs` — partition entries into review sessions

**ACTION**: Delivers **AC-A1**, **AC-A2**, **AC-A4** and **AC-A5**. Add an exported pure helper that partitions an artifact's `entries` into sessions: walk the entries in order, close the current session when a verdict is in the `PASSING` set, and start a new session with the following entry; a trailing group with no passing verdict is itself a session. Define the boundary in terms of the existing `PASSING` set at line 59 rather than a literal `'APPROVED'`, so `RUBRIC_PASSED` closes a session too. Leave the artifact shape from line 91 intact — the artifact stays the unit of degraded exclusion and marker classification — and expose sessions as a derived view. Then change `aggregate()` so the rework metric is runs per SESSION and first-attempt failure is computed from the first entry of each session, and so it also reports the session count and how many artifacts split into more than one. Do not touch `hasDegradedTimestamp` or `classifyArtifacts`: an artifact with a degraded entry stays excluded whole, which is what `timestamp-contract`'s CONSUMERS registry asserts.

**MIRROR**: `# SOURCE: scripts/efficiency.mjs:59` — the `PASSING` set the boundary must reuse.

**VALIDATE**:
```bash
set -euo pipefail
node --check scripts/efficiency.mjs
node -e '
import("./scripts/efficiency.mjs").then((m) => {
  const names = Object.keys(m);
  const splitter = names.find((n) => /session/i.test(n) && typeof m[n] === "function");
  if (!splitter) { console.error("FAIL: no exported session-partition function; exports were " + names.join(", ")); process.exit(1); }
  const S = m[splitter];
  const mk = (vs) => ({ stage: "plan-review", file: "f", entries: vs.map((v) => ({ verdict: v, timestamp: "2026-08-05T00:00:01Z", degraded: false, rubric: [] })) });
  const one = S(mk(["CHANGES_REQUESTED", "APPROVED"]));
  if (one.length !== 1) { console.error(`FAIL: a single retry loop split into ${one.length} sessions, expected 1`); process.exit(1); }
  const three = S(mk(["APPROVED", "APPROVED", "CHANGES_REQUESTED", "APPROVED"]));
  if (three.length !== 3) { console.error(`FAIL: two APPROVEDs then a loop gave ${three.length} sessions, expected 3`); process.exit(1); }
  const trailing = S(mk(["APPROVED", "CHANGES_REQUESTED"]));
  if (trailing.length !== 2) { console.error(`FAIL: an unresolved trailing session was dropped (${trailing.length} sessions, expected 2)`); process.exit(1); }
  const rp = S(mk(["RUBRIC_PASSED", "CHANGES_REQUESTED"]));
  if (rp.length !== 2) { console.error("FAIL: RUBRIC_PASSED does not close a session, but it is in the PASSING set"); process.exit(1); }
  if (typeof m.hasDegradedTimestamp !== "function") { console.error("FAIL: hasDegradedTimestamp export was removed"); process.exit(1); }
  console.log("PASS: session partition correct on all four shapes, degraded export intact");
}).catch((e) => { console.error("FAIL: " + e.message); process.exit(1); });
'
```

### Task 2: UPDATE `scripts/efficiency.mjs` — surface the correction in the report

**ACTION**: Delivers **AC-A3**. Make both `snapshot` and `compare` report the rework metric as runs per session and label it as such, so no reader mistakes it for the old per-file figure. Add a notice, mirroring the existing degraded-exclusion block's shape, stating how many artifacts were split into more than one session and how many sessions resulted — printed whenever any split occurred, so the correction is visible rather than silent. Keep every existing warning intact: the small-sample caution, the date-only-boundary warning, and the degraded-exclusion warning with its per-file enumeration.

**MIRROR**: `# SOURCE: scripts/efficiency.mjs:238` — the surface-doubt warning idiom this notice copies.

**VALIDATE**:
```bash
set -euo pipefail
out=$(node scripts/efficiency.mjs compare 2>&1)
printf '%s' "$out" | grep -qiE 'per session' || { echo "FAIL: compare does not label the rework metric per session"; exit 1; }
printf '%s' "$out" | grep -qiE 'session' || { echo "FAIL: no session notice in compare output"; exit 1; }
printf '%s' "$out" | grep -qF 'timestamp_degraded' || { echo "FAIL: the degraded-exclusion warning was lost"; exit 1; }
printf '%s' "$out" | grep -qiE 'small sample|CAUTION' || { echo "FAIL: the small-sample caution was lost"; exit 1; }
echo "PASS: compare reports per-session rework and keeps every prior warning"
```

### Task 3: UPDATE `documentation/reference/validation-checks.html` and `documentation/changelog.html`

**ACTION**: Delivers **AC-A6** and **AC-A7**. Reconcile the `efficiency-metrics` section's `Unit tests (N)` figure with whatever `node --test scripts/efficiency.test.mjs` actually reports after the test pair lands, update that check's row in the summary table, and recompute the page's totals line so it equals the sum of the summary table's own Unit tests column. Then replace the `Unreleased` placeholder (`<p><em>No changes queued yet.</em></p>`) with an entry describing the measurement fix — what was wrong, the corrected per-stage figures, and that earlier runs-per-artifact claims are superseded. Keep the `Unreleased` heading itself present per AGENTS.md §7.3. The reference page uses literal em-dashes; the changelog uses `&mdash;` entities. No emojis. Do not bump `plugin.json` — nothing under `plugins/relay/` is touched.

**MIRROR**: `# SOURCE: documentation/reference/validation-checks.html:173` — the section being reconciled.

**VALIDATE**:
```bash
set -euo pipefail
html=documentation/reference/validation-checks.html
cited=$(tr -d '\r' < "$html" | awk '/<h2 id="efficiency-metrics">/{f=1} f && /<h2 /&&!/efficiency-metrics/{exit} f' | grep -oE 'Unit tests \([0-9]+\)' | grep -oE '[0-9]+')
# Reporter is pinned: node --test picks its default reporter by TTY detection, and the
# default emits a multibyte-prefixed "<INFO> tests 12" while TAP emits "# tests 12".
# Scraping the unpinned default is the defect class recorded for
# figma-quota-resilience-phase-2 (a '# fail' grep against an emitted 'INFO fail 2').
actual=$(node --test --test-reporter=tap scripts/efficiency.test.mjs 2>&1 | grep -aE '^# tests [0-9]+$' | grep -oE '[0-9]+$' | head -1)
[ -n "$actual" ] || { echo "FAIL: efficiency.test.mjs reported no TAP test count"; exit 1; }
[ "$cited" = "$actual" ] || { echo "FAIL: page cites $cited efficiency unit tests, suite reports $actual"; exit 1; }
flat=$(tr -d '\r' < "$html" | tr '\n' ' ' | tr -s ' ')
sum=$(tr -d '\r' < "$html" | awk '/<tbody>/{f=1} /<\/tbody>/{f=0} f' | grep -oE '<td>[0-9]+</td>' | grep -oE '[0-9]+' | awk '{s+=$1} END {print s}')
stated=$(printf '%s' "$flat" | grep -oE 'Totals:</strong> [0-9]+' | grep -oE '[0-9]+')
[ "$sum" = "$stated" ] || { echo "FAIL: totals line states $stated, summary table column sums to $sum"; exit 1; }
cl=$(tr -d '\r' < documentation/changelog.html | tr '\n' ' ' | tr -s ' ')
unrel=$(printf '%s' "$cl" | sed 's/.*<h2 id="unreleased">Unreleased<\/h2>//' | sed 's/<h2 id="v0-28-1">.*//')
if printf '%s' "$unrel" | grep -qF 'No changes queued yet.'; then echo "FAIL: the Unreleased placeholder survives"; exit 1; fi
printf '%s' "$unrel" | grep -qF 'efficiency.mjs' || { echo "FAIL: changelog entry does not name the changed script"; exit 1; }
printf '%s' "$cl" | grep -qF '<h2 id="unreleased">Unreleased</h2>' || { echo "FAIL: the Unreleased heading was removed, breaking the corpus invariant"; exit 1; }
grep -q '"version": "0.28.1"' plugins/relay/.claude-plugin/plugin.json || { echo "FAIL: plugin.json changed; this ships no plugin asset"; exit 1; }
echo "PASS: reference page reconciled, changelog logged, no release cut"
```

### Task 4: UPDATE `docs/context/constraints.md` — correct the reviewer-non-determinism item

**ACTION**: Delivers **AC-A8**. Rewrite the "Reviewer non-determinism across attempts" item in place, preserving its bolded-title shape. Record what the corpus shows rather than deleting the item: across 204 consecutive attempt pairs, 75.0% of retries resolve the failure, 9.9% of second-attempt failures are regressions where an item passed in one attempt and failed in the next, 9.8% of pairs fail a fully disjoint set, and 5.4% fail the identical set. State that the metric is sound because all 640 runs record `passed:true` rows with a median rubric array of 13 items, so pass sets are populated and regressions are detectable. Conclude that the phenomenon is real but small, that it does not warrant a wave, and that the two candidate fixes the item previously named — deterministic K=5 ordering, and carrying prior-attempt findings forward — are not justified by this evidence. Name honestly what the measurement cannot separate: the writer legitimately changes the plan between attempts, so a newly-failing item may be genuinely newly-introduced rather than reviewer drift.

**MIRROR**: `# SOURCE: docs/context/constraints.md:83` — the open-item shape being rewritten.

**VALIDATE**:
```bash
set -euo pipefail
flat=$(tr -d '\r' < docs/context/constraints.md | tr '\n' ' ' | tr -s ' ')
printf '%s' "$flat" | grep -qF 'Reviewer non-determinism across attempts.' || { echo "FAIL: the item was deleted rather than rewritten"; exit 1; }
for n in '75' '9.9' '9.8' '5.4' '204'; do
  printf '%s' "$flat" | grep -qF "$n" || { echo "FAIL: measured figure $n is not recorded"; exit 1; }
done
printf '%s' "$flat" | grep -qiE 'newly-introduced|newly introduced|cannot separate' || { echo "FAIL: the confound the measurement cannot separate is not named"; exit 1; }
echo "PASS: item rewritten with the measurement and its limits"
```

### Task 5: UPDATE `docs/decisions.md` — record the defect and what it supersedes

**ACTION**: Delivers **AC-A9**. Append a dated `[2026-08-05]` entry following the existing Context / Decision / Reason / Areas-affected shape. Context must carry EVERY figure the entry uses before Decision refers to any of them — 640 runs, six repositories, 34 of 376 artifacts (9.0%) holding more than one passing verdict, the per-stage before/after pairs (test-write-review 2.38 to 1.25, plan-review 1.79 to 1.67, code-review 1.49 to 1.37), and the first-attempt deltas (code-review 28.5 to 29.4, plan-review 50.8 to 49.5, test-write-review 26.5 to 21.5) — plus the provenance sentence: the cross-project aggregation ran over six repositories, five of which live outside this one, so `scripts/efficiency.mjs` cannot reproduce those figures, while the single-repo figures ARE reproducible here after this fix. Decision must state the session-splitting rule and, explicitly, that any earlier claim resting on runs-per-artifact is superseded — naming the founding diagnosis's "test-write-review is the worst stage at 3.50 runs" as the specific claim now inverted. Reason must explain why the APPROVED-boundary tell is sound rather than heuristic: an APPROVED terminates a retry loop, so two of them in one file necessarily mean two sessions.

**MIRROR**: `# SOURCE: docs/decisions.md:1723` — the cross-project provenance sentence to mirror.

**VALIDATE**:
```bash
set -euo pipefail
# EVERY assertion here is scoped to the NEW entry, never the whole file. A repo-wide
# grep would be always-pass: "superseded" already occurs 4 times in docs/decisions.md
# and "3.50" once, both from earlier entries, so a file-wide check would report success
# before this task ran at all.
node -e '
const { readFileSync } = require("fs");
const L = readFileSync("docs/decisions.md", "utf8").replace(/\r/g, "").split("\n");
let s = -1;
for (let i = L.length - 1; i >= 0; i--) if (/^## \[2026-08-05\]/.test(L[i])) { s = i; break; }
if (s < 0) { console.error("FAIL: no 2026-08-05 entry"); process.exit(1); }
const entry = L.slice(s).join("\n");
const ci = entry.indexOf("**Context:**"), di = entry.indexOf("**Decision:**");
if (ci < 0 || di < 0) { console.error("FAIL: entry lacks Context/Decision markers"); process.exit(1); }
const ctx = entry.slice(ci, di), dec = entry.slice(di);
// General, not a hardcoded subset: EVERY decimal figure cited in Decision must already
// appear in Context. The negative lookahead drops step and version references such as
// "Step 4.4.ter" and "0.28.1", which are not statistics. Verified against the existing
// 2026-08-05 entry: it yields 77.8, 53.8, 1.6, 2.8, 2.0, 1.8, 0.089, 47.2, 22.7, 18.2
// and zero orphans, so the scan does not false-fail on well-formed prose.
const cited = [...new Set([...dec.matchAll(/\b\d+\.\d+(?![.\d])/g)].map((m) => m[0]))];
const orphan = cited.filter((f) => !ctx.includes(f));
if (orphan.length) { console.error("FAIL: figures asserted in Decision but absent from Context: " + orphan.join(", ")); process.exit(1); }
for (const n of ["640", "34", "376"]) {
  if (dec.includes(n) && !ctx.includes(n)) { console.error(`FAIL: integer figure ${n} is asserted in Decision but absent from Context`); process.exit(1); }
}
// Entry-scoped, deliberately: a repo-wide grep for this phrase already matches the
// PRECEDING 2026-08-05 entry, so it would pass without this entry carrying its own note.
if (!/cannot reproduce|outside this repos/i.test(ctx)) { console.error("FAIL: this entry's Context carries no cross-project provenance note"); process.exit(1); }
if (!/superseded/i.test(dec)) { console.error("FAIL: this entry's Decision does not record the supersession"); process.exit(1); }
if (!dec.includes("3.50")) { console.error("FAIL: this entry's Decision does not name the inverted 3.50 founding figure"); process.exit(1); }
if (!ctx.includes("1.25")) { console.error("FAIL: this entry's Context lacks the corrected test-write-review figure"); process.exit(1); }
console.log("PASS: figures anchored in Context, supersession and provenance recorded");
'
```

## Validation Commands

### Level 1 — STATIC_ANALYSIS

```bash
set -euo pipefail
node --check scripts/efficiency.mjs
node --check scripts/efficiency.test.mjs
node -e '
const { readFileSync } = require("fs");
for (const f of ["documentation/reference/validation-checks.html", "documentation/changelog.html"]) {
  const s = readFileSync(f, "utf8");
  if (/<style[\s>]/.test(s)) { console.error(`FAIL: ${f} inline <style>`); process.exit(1); }
  if (/\sstyle="/.test(s)) { console.error(`FAIL: ${f} inline style attribute`); process.exit(1); }
  if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(s)) { console.error(`FAIL: ${f} emoji`); process.exit(1); }
}
console.log("AGENTS.md section 2 invariants hold");
'
```

### Level 2 — UNIT_TESTS

```bash
set -euo pipefail
node --test scripts/efficiency.test.mjs
node --test scripts/validate/checks/timestamp-contract.test.mjs
node --test scripts/validate/checks/feedback-chain.test.mjs
```

`node --test` exits non-zero on any failing test, so the tool's own status propagates and `set -e` fails the block. These three suites are named rather than globbing the corpus, for a reason recorded in `## NOT Building`: one assertion in `figma-visual-first-track-phase6.test.mjs` is already red on the unmodified tree from commit `09ad56b`, and a whole-corpus gate would inherit that failure and report it as this change's. `timestamp-contract.test.mjs` is included specifically because its CONSUMERS registry pins `scripts/efficiency.mjs`; it is the suite this change is most likely to break. The single-file form is deliberate — passing a directory to `node --test` triggers a `MODULE_NOT_FOUND` resolution failure in this repo.

### Level 3 — INTEGRATION

```bash
set -euo pipefail
npm run validate 2>&1 | tee /dev/stderr | grep -qE '^12 passed, 0 failed'
node -e '
import("./scripts/efficiency.mjs").then((m) => {
  const arts = m.readCorpus();
  const splitter = Object.keys(m).find((n) => /session/i.test(n) && typeof m[n] === "function");
  const multi = arts.filter((a) => m[splitter](a).length > 1);
  const sessions = arts.reduce((n, a) => n + m[splitter](a).length, 0);
  if (!arts.length) { console.error("FAIL: corpus read as empty"); process.exit(1); }
  if (!multi.length) { console.error("FAIL: no artifact split, but 34 were measured as multi-session"); process.exit(1); }
  if (sessions <= arts.length) { console.error(`FAIL: ${sessions} sessions from ${arts.length} artifacts — splitting did not happen`); process.exit(1); }
  console.log(`PASS: ${arts.length} artifacts to ${sessions} sessions, ${multi.length} split`);
}).catch((e) => { console.error("FAIL: " + e.message); process.exit(1); });
'
```

`npm run validate` must report `12 passed, 0 failed`, which transitively confirms `timestamp-contract` still accepts `scripts/efficiency.mjs` as a compliant consumer. The Node block then asserts the split genuinely occurred against the real corpus rather than only against synthetic fixtures — a change that compiled but partitioned nothing would pass Level 1 and Level 2's fixture tests while leaving the defect in place.

## Acceptance Criteria

R8b (PRD AC-N token check) does not apply in description mode — this plan has no source PRD, so no acceptance criterion carries a `(PRD AC-N)` reference.

- **AC-A1:** `scripts/efficiency.mjs` exports a pure function partitioning an artifact's entries into review sessions, where a session closes on any verdict in the existing `PASSING` set and the following entry opens the next, and a trailing group with no passing verdict is itself a session.
- **AC-A2:** The session boundary is defined in terms of the `PASSING` set rather than a literal `'APPROVED'` comparison, so `RUBRIC_PASSED` closes a session too.
- **AC-A3:** `snapshot` and `compare` report the rework metric per session, labelled as such, and print how many artifacts split into more than one session and how many sessions resulted — while retaining the small-sample caution, the date-only-boundary warning, and the degraded-exclusion warning with its per-file enumeration.
- **AC-A4:** First-attempt failure is computed from the first entry of each session rather than the first entry of each file.
- **AC-A5:** The degraded-timestamp policy is unchanged: `hasDegradedTimestamp` still operates on a whole artifact and `classifyArtifacts` still excludes an affected artifact from both sides, so `timestamp-contract`'s CONSUMERS assertion continues to hold and `npm run validate` reports 12 passed, 0 failed.
- **AC-A6:** `documentation/reference/validation-checks.html`'s `efficiency-metrics` section cites the count `node --test scripts/efficiency.test.mjs` actually reports, its summary-table row agrees, and the page's totals line equals the sum of that column.
- **AC-A7:** `documentation/changelog.html` carries an `Unreleased` entry naming `efficiency.mjs` and describing the correction, with the `Unreleased` heading itself preserved and no `plugin.json` change.
- **AC-A8:** `docs/context/constraints.md`'s reviewer-non-determinism item is rewritten — not deleted — recording the 204-pair measurement (75.0% resolve, 9.9% regressions, 9.8% disjoint, 5.4% identical), the metric's soundness, the conclusion that neither previously-named candidate fix is justified, and the confound the measurement cannot separate.
- **AC-A9:** `docs/decisions.md` carries a dated `[2026-08-05]` entry whose Context holds every figure its Decision references, including the per-stage before/after pairs and the cross-project provenance note, and whose Decision explicitly supersedes earlier runs-per-artifact claims and names the inverted 3.50 founding figure.
- **AC-A10:** The unit-test suite covers the session partition — single loop, multiple passing verdicts, unresolved trailing session, `RUBRIC_PASSED` boundary — and pins the preserved degraded behavior, with fixtures that genuinely fail when the partition is broken. Authored by the test pair under R-X strict; no Implementer task creates or edits a test file.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| The session boundary is written as a literal `'APPROVED'` check, silently mis-splitting every `RUBRIC_PASSED` artifact | Medium | High — a second grouping defect shipped while fixing the first | AC-A2 requires the `PASSING` set; Task 1's VALIDATE asserts a `RUBRIC_PASSED` fixture splits, which a literal comparison fails. |
| The change restructures the degraded-flag consumer code, turning `timestamp-contract` red | Medium | High — `npm run validate` blocks every commit via the pre-commit hook | Task 1's ACTION forbids touching `hasDegradedTimestamp`/`classifyArtifacts`; its VALIDATE asserts the export survives; Level 2 runs `timestamp-contract.test.mjs`; Level 3 requires 12/12. |
| The split compiles but partitions nothing, so fixture tests pass while the real corpus is unchanged | Medium | High — the defect ships believed fixed | Level 3 runs the partition against the real corpus and fails unless sessions exceed artifacts and at least one artifact split. |
| Figures land in the decisions Decision paragraph without appearing in Context | High, on this file's record | Medium — the exact defect that caused two consecutive rejections on the previous change | Task 5's VALIDATE slices the entry and scans Decision for EVERY decimal figure it cites, failing on any absent from Context, plus the three named integer figures. The scan excludes step and version references (`4.4.ter`, `0.28.1`) via a negative lookahead, verified against the existing entry to produce zero false orphans. |
| The recorded markers no longer reproduce, and the honesty guard warns on every future compare | High | Low, if expected | `## NOT Building` states markers are deliberately not rewritten; the decisions entry records that the guard will legitimately warn until a post-fix marker is recorded. |
| `research-codebase` / `research-web` returned no findings — grounding was done by direct reads | n/a | Low | Documented in `## Notes`; every `# SOURCE:` anchor cites a real, verified `file:line`. |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.

**Ordering, and why Task 3 comes last among the Implementer tasks.** Task 3 cites the efficiency suite's unit-test count on a published page, and that count cannot be cited before the test pair has grown the suite. Run Tasks 1 and 2, then `/relay-write-test` and `/relay-test-write-review`, then Tasks 3 through 5. Task 3 fails closed if that ordering is not respected — its VALIDATE invokes `node --test` on the suite and compares. This is the same data-dependency deviation used and accepted twice before in this initiative; `tdd:` is untouched and the test pair remains the sole author of the test file.

**Grounding was performed by direct reads, not research subagents.** Phase 2 GROUNDING dispatched neither `research-codebase` nor `research-web`. The work is internal and has no external-pattern component, so `research-web` would return a `degradation_reason` by construction; `scripts/efficiency.mjs` was read end to end, along with the CONSUMERS contract in `timestamp-contract.mjs` and both governance records.

**Every VALIDATE command in this plan was executed against the unmodified tree before the plan was written**, and each exits non-zero today. The positive direction was checked too: `node scripts/efficiency.mjs compare` currently emits `runs per artifact`, which is what Task 2's grep must stop finding, so that command is not an always-fail. The tree is CRLF, so every command matching a phrase that spans a line break normalizes with `tr -d '\r'` first.

**Why the APPROVED-boundary tell needs no filename heuristic.** A retry loop only continues after a rejection, so an APPROVED verdict terminates it. A file holding two APPROVED verdicts therefore holds at least two independent review sessions — necessarily, not probably. That is why this fix works on the existing corpus without renaming anything, and why it does not depend on knowing which stages use feature-named files.

**What this correction does not touch.** The wave-2 decision rested on first-attempt failure rates, which move by at most 4.9 points here, not on runs per artifact. It stands as recorded.

*Generated: 2026-08-05*
*Approved: 2026-08-05*
*Implemented: 2026-08-05*
*Status: IMPLEMENTED*
