# Feature: Close the consumer half of the v0.25.0 timestamp contract (description mode)

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting pattern (a producer/consumer contract spanning `scripts/` and `plugins/relay/`); reuse or creation of components (a net-new CONSUMERS registry inside an existing validate check); impact on a reusable service (`scripts/efficiency.mjs` is shelled out to by the `/efficiency-report` skill); creation of exported module surface consumed by other files
- Decisions found:
  - `docs/decisions.md` [2026-07-31] "Reviewer jsonl timestamps are invoker-supplied (`review_started_at`)" — the `timestamp_degraded` fallback is "'no silent failure' applied to a data-quality gap: an invoker bug that drops `review_started_at` becomes visible in the corpus instead of manifesting as another undetectable `T00:00:00Z` stamp". A consumer that trusts the flagged value defeats the stated purpose of the flag; this plan closes that gap.
  - `docs/decisions.md` [2026-07-31], same entry — "Historic degenerate entries are deliberately NOT repaired ... the real instant was never observed and cannot be reconstructed." Binds this plan to leave the 128 unflagged historic entries alone.
  - `docs/decisions.md` [2026-07-12] / [2026-05-06] / [2026-07-10] — R-X strict: the Implementer authors ZERO test files. Every test file named below is test-pair work.
  - `docs/decisions.md` [2026-07-30] "Writer pre-emission self-checks" — the wave-2 revert threshold is stated in terms of the plan-review first-attempt failure rate, which is precisely the number this defect corrupts.
- Applicable anti-patterns:
  - `docs/anti-patterns.md` "Writing pipeline artifacts under `.claude/`" — this plan writes only to `PRPs/plans/`; the one `.claude/commands/efficiency-report.md` edit is a modification of an existing committed command file, not a new pipeline artifact.
  - `docs/anti-patterns.md` "Weakening or deleting tests to make the auto-correction loop turn green" — binds the test-pair work: the new suites must pin each assertion by mutating a passing baseline, never by relaxing an assertion.
  - `docs/anti-patterns.md` "Treating `plugins/prp-core/` as active relay code" — not implicated; no `prp-core` file is touched.
- Applicable architectural rules:
  - Validate checks are registry-driven with a pure exported check function plus a thin I/O wrapper (`scripts/validate/checks/*.mjs`); registry omissions are carried as comments, never silent gaps.
  - Node.js >= 18, zero npm runtime dependencies.
  - Every `documentation/` change requires a `documentation/changelog.html` entry (`documentation/AGENTS.md` §7.4).
  - Interactivity boundary: this plan's tasks run without user dialogue.
- Result: PROCEED
```

## Source

Close the consumer half of the v0.25.0 review_started_at timestamp contract: scripts/efficiency.mjs must stop trusting a timestamp_degraded entry's timestamp, and scripts/validate/checks/timestamp-contract.mjs must gain a consumer-side assertion so the producer/consumer contract is mechanically symmetric.

VERIFIED DEFECT (reproduced on the unmodified tree at commit 5302839, before planning):
- PRPs/plans/add-an-11th-static-check-to-scriptsvalidate-that.review.jsonl line 1 is {"timestamp":"2026-07-31T00:00:00Z","timestamp_degraded":true,"verdict":"CHANGES_REQUESTED",...}. This is the v0.25.0 contract working correctly: plan-reviewer is clockless (tools: Read, Edit, Write), was dispatched without review_started_at, and set the flag rather than fabricating an instant.
- `grep -c timestamp_degraded scripts/efficiency.mjs` returns 0 on the unmodified tree. Nothing reads the label.
- `node scripts/efficiency.mjs compare` on the unmodified tree prints "plan-review / no new artifacts since the marker (before: 82)" while its own honesty-guard warning prints "plan-review: snapshot recorded 81 artifacts, recomputed 82". The v0.25.0 marker is 2026-07-31T18:02:16.966Z; the degraded artifact was reviewed AFTER it but its midnight stamp sorts it into BEFORE. That single artifact is the entire 81-vs-82 drift.
- Corpus-wide there is exactly ONE genuine degraded entry. The only other file matching the token, PRPs/plans/fix-degenerate-t000000-timestamps-in-relay-reviewer-jsonl.code-review.jsonl, mentions "timestamp_degraded" inside a reviewer's prose reason string, NOT as a JSON field — any implementation or validation command that greps the corpus by substring instead of parsing JSON will be wrong about this. Parse, do not grep, when counting degraded ENTRIES.

DECIDED POLICY — option (a), exclusion, NOT classify-with-a-warning:
An artifact ANY of whose entries carries timestamp_degraded: true is UNCLASSIFIABLE and is excluded from BOTH the before and after sets, exactly like the existing `undated` bucket at scripts/efficiency.mjs:178. Rationale to carry into the plan's Notes and into the module docblock: the flag declares the stamp is a placeholder, so a placeholder anywhere in an artifact's history means its first-verdict instant cannot be established; the file already has an idiom for "no usable timestamp — excluded from both sides, count reported", and this reuses it rather than inventing a second doubt-signalling mechanism. Do NOT implement a cleverer partially-sound rule (e.g. "classify as BEFORE when some real entry predates the marker") — the extra precision only sharpens the already-approximate BEFORE side, never the scarce AFTER side, and is not worth the complexity. Over-exclusion is the safe direction; silently trusting the value is the forbidden one.

REQUIRED VISIBLE OUTPUT: `compare` must print a distinct, loud warning naming the affected artifact FILES (not just a count), in the same register as the two warnings already there (the snapshot-drift warning at scripts/efficiency.mjs:194-200 and the undated warning at :201-203). It must be a separate message from the undated one — a reader must be able to tell "no timestamp at all" from "a timestamp the producer itself labelled untrustworthy". Mirror the existing "WARNING - ..." prefix and two-space indentation.

EXPECTED BEHAVIOUR CHANGE, to be asserted: after the fix, `node scripts/efficiency.mjs compare` no longer prints the "plan-review: snapshot recorded 81 artifacts, recomputed 82" drift line (the recomputed before-set returns to 81, matching the snapshot), and instead prints the new degraded-exclusion warning naming add-an-11th-static-check-to-scriptsvalidate-that.review.jsonl. Both directions must be verified: the drift line is present before the change and absent after.

TESTABILITY REFACTOR (necessary, in scope): scripts/efficiency.mjs today dispatches on process.argv at module top level (lines 239-249), so it cannot be imported without executing and calling process.exit(2). To let the exclusion rule be unit-tested as a pure function rather than only through a CLI smoke test, export the classification logic (and the pieces it needs) and guard the CLI dispatch so importing the module has no side effects. Follow the shape already used by every check under scripts/validate/checks/: a pure exported function with no I/O plus a thin wrapper that does the reading. Keep the CLI behaviour byte-identical for both `snapshot` and `compare` apart from the new warning — the /efficiency-report skill shells out to it via an allowed-tools Bash pattern.

VALIDATE-CHECK DECISION — the consumer-side assertion IS in scope and must be built:
Add a CONSUMERS registry to scripts/validate/checks/timestamp-contract.mjs, mirroring the existing flat REVIEWERS (line 67) and COMMANDS (line 84) arrays and their append-never-replace comment convention, listing scripts/efficiency.mjs. Assert the consumer actually honors the flag, not merely that the token appears somewhere. The check's own docblock and the deliberate-exclusion comment convention (lines 38-50) must be extended to explain why this consumer is registered and why any other file is not — carry exclusions as comments, never silent omissions. Add the new path to WATCHED_FILES via the same spread idiom at line 96. Rationale for the plan's Notes: the check gated only the producer half, which is exactly how this gap shipped in the same session that built the check; feedback-chain.mjs's PAIRS registry is the precedent for gating both ends.

TEST-PAIR SCOPE (R-X strict, docs/decisions.md [2026-07-12]): the Implementer authors ZERO test files. Every test file below must be planned as test-pair work (EXISTING_TEST_UPDATED for the existing suite, NEW_TEST_REQUIRED for a new one), never as an Implementer task:
- scripts/validate/checks/timestamp-contract.test.mjs — EXISTING (22 tests today); needs new cases for the CONSUMERS registry: a consumer that honors the flag passes, a consumer that does not fails, and the WATCHED_FILES shape tests updated for the added path.
- a new unit suite for scripts/efficiency.mjs's exclusion rule — there is no efficiency test file today. Cases must include: an artifact whose only entry is degraded is excluded from both sides; an artifact with no degraded entry classifies exactly as before (no regression in the existing before/after rule); the degraded exclusion is reported separately from the undated exclusion; and the prose-mention decoy (a reason string containing the token timestamp_degraded with no such JSON field) is NOT treated as degraded. Pin each assertion by mutating a passing baseline, per the precedent recorded in the docs/context/constraints.md 2026-07-31 discharge note, not merely by observing green.

DOCS SCOPE (all four are required, none is optional):
- docs/context/constraints.md — the existing "Degenerate T00:00:00Z reviewer timestamps — historic entries are unrecoverable (2026-07-31)" entry states as a live consequence that efficiency.mjs "silently counted as pre-change". That sentence becomes stale on merge and must be amended to record the new exclusion policy, keeping the day-apart-boundaries caveat for the 128 unrecoverable historic entries (which carry NO flag and are therefore still classified, not excluded — say so explicitly so the two populations are not confused).
- docs/decisions.md — a new dated entry recording the exclusion-over-classification choice and the rejected alternative, in the house format (Context / Decision / Reason).
- .claude/commands/efficiency-report.md — step 2 "Read the output honestly before interpreting it" enumerates the exact warnings the reader must not skip past. The new degraded-exclusion warning must be added there or the skill will walk past it.
- documentation/ — documentation/reference/validation-checks.html carries a per-check timestamp-contract section, a unit-test count of 22 in its table row (line 48), and a "Totals: 133 node:test unit tests ... 11 checks" line (line 53); that page's Level 3 validation self-reconciles registered checks against documented sections, so stale counts fail validation. Update the section prose for the new assertion and both counts to the real post-change numbers. Per documentation/AGENTS.md §7.4 every documentation/ change also needs a documentation/changelog.html entry. Read documentation/AGENTS.md before touching anything under documentation/.

OUT OF SCOPE, decided by omission deliberately — state these in the plan's Notes so they are not silently reopened: no repair or backfill of the 128 historic T00:00:00Z entries (docs/decisions.md [2026-07-31] settled this); no change to any reviewer or command prompt under plugins/relay/ (the producer half is correct and shipping); no plugin.json version bump (nothing under plugins/relay/ changes); no new snapshot marker is cut.

VALIDATION COMMANDS — this repo's dominant plan defect is a validation command that cannot fail (an always-pass grep) or cannot pass (an always-fail comparison). Every VALIDATE command in this plan must be run against the UNMODIFIED tree first and must FAIL there, and must pass only after the change. The tree is CRLF: any grep for a phrase that spans a line break must normalise first with `tr -d '\r' | tr '\n' ' ' | tr -s ' '`. Prefer commands that assert observable behaviour — e.g. run `node scripts/efficiency.mjs compare` and assert on its actual stdout, and run `npm run validate` and `node --test` (glob form, never `node --test <dir>`, which yields MODULE_NOT_FOUND in this repo) — over greps for source substrings. Where a grep is genuinely the right tool, pair it with the inverse assertion so a vacuous match is detectable.

Commit directly on the development branch when complete; do not push.

## Summary

v0.25.0 stopped clockless reviewers from fabricating `T00:00:00Z` instants: they
now append their verdict with `"timestamp_degraded": true` instead. Nothing
reads that label. `scripts/efficiency.mjs compare` still classifies every
artifact by its first verdict's raw timestamp, so a flagged midnight stamp
still sorts a post-marker artifact into the BEFORE set — the defect the flag
exists to prevent, now merely labelled instead of silent. This phase teaches
the consumer to honor the label: any artifact carrying a `timestamp_degraded`
entry becomes UNCLASSIFIABLE and is excluded from both sides, reported through a
new, distinct `WARNING -` line that names the affected files. To make that rule
unit-testable, `efficiency.mjs` gains a pure exported classifier and an
`import.meta.url` guard on its CLI dispatch (today the module cannot be imported
without calling `process.exit(2)`). Finally, `timestamp-contract.mjs` gains a
`CONSUMERS` registry that asserts each registered consumer references the flag
in executable code — not merely in a comment — so the contract is gated at both
ends rather than only at the producer.

## User Story

As the engineer running relay's efficiency initiative,
I want `compare` to refuse to classify artifacts whose timestamps the producer
itself flagged as unreliable,
So that the plan-review first-attempt failure rate — the number the wave-2
revert and wave-3 go/no-go decisions hinge on — is computed only from artifacts
whose side of the marker is actually known.

## Problem Statement

`scripts/efficiency.mjs` classifies each artifact by its FIRST verdict's
timestamp against a recorded release marker, and has no knowledge of the
`timestamp_degraded` field at all — `readCorpus` does not even parse it off the
jsonl entry (`scripts/efficiency.mjs:69-74`). Reproduced on the unmodified tree
at commit `5302839`: `PRPs/plans/add-an-11th-static-check-to-scriptsvalidate-that.review.jsonl`
line 1 carries `"timestamp":"2026-07-31T00:00:00Z"` with `"timestamp_degraded":true`,
was reviewed after the `v0.25.0` marker (`2026-07-31T18:02:16.966Z`), and is
counted in the BEFORE set. `compare` therefore reports `plan-review: no new
artifacts since the marker (before: 82)` while its own honesty guard
simultaneously prints `plan-review: snapshot recorded 81 artifacts, recomputed
82` — the same artifact, counted on the wrong side. The producer half of the
contract works; the consumer half does not exist. Symmetrically,
`scripts/validate/checks/timestamp-contract.mjs` gates only that reviewers EMIT
the flag correctly; nothing verifies any consumer HONORS it, which is how this
gap shipped in the same session that built the check.

## Solution Statement

Teach `efficiency.mjs` that a `timestamp_degraded` entry has an unreliable
timestamp, and extend `timestamp-contract.mjs` to gate the consumer end.

1. `readCorpus` retains a `degraded` boolean per entry, parsed from the JSON
   object's `timestamp_degraded` field (parsed, never grepped — one file in the
   corpus contains the token inside a prose `reason` string and must not match).
2. A `hasDegradedTimestamp` helper mirrors the existing one-line `firstSeen`
   style. `doCompare` partitions degraded artifacts out BEFORE the existing
   before/after/undated split, so they land in neither aggregate.
3. A new `WARNING -` block, distinct from the undated one, names the excluded
   files so the exclusion is visible rather than merely absent.
4. The classification logic moves into a pure exported `classifyArtifacts`
   function; the CLI dispatch is guarded with `import.meta.url ===
   pathToFileURL(process.argv[1] || '').href` so the module can be imported.
5. `timestamp-contract.mjs` gains a `CONSUMERS` registry asserting each entry
   references `timestamp_degraded` in executable code — comments are stripped
   before the assertion, so documenting the flag without consuming it fails.

Policy choice is exclusion, not classify-with-a-warning: the flag declares the
stamp a placeholder, and the file already has an idiom for "no usable timestamp
— excluded from both sides, count reported". Over-exclusion is the safe
direction. The rejected alternative and its rationale are recorded in
`docs/decisions.md`.

## Metadata

| Field | Value |
|-------|-------|
| Type | Defect fix + mechanical enforcement |
| Complexity | Medium |
| Systems Affected | `scripts/efficiency.mjs`, `scripts/validate/checks/timestamp-contract.mjs`, `docs/`, `.claude/commands/`, `documentation/` |
| Dependencies | v0.25.0 producer contract (commit `e0a0c17`); `timestamp-contract` check (commit `5302839`) |
| Estimated Tasks | 5 Implementer tasks + 2 test-pair suites |
| Source PRD line ref | n/a — description mode, no source PRD |
| `phase_type` | `feature` |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `scripts/efficiency.mjs` | 22-33, 60-79, 115-116, 174-203, 239-249 | The docblock rules being amended, the entry shape that must retain the flag, the classification helper, the partition + warning blocks to extend, and the unguarded CLI dispatch. |
| P0 | `scripts/validate/checks/timestamp-contract.mjs` | 32-50, 59-96, 151-220 | The registry-precedent docblock, the two existing flat registries + `WATCHED_FILES` spread, and the loop bodies the `CONSUMERS` loop sits alongside. |
| P0 | `docs/decisions.md` | 1318-1376 | The [2026-07-31] entry that created `timestamp_degraded` and states its purpose; binds this plan's policy and forbids repairing historic entries. |
| P1 | `scripts/validate/checks/feedback-chain.mjs` | 50-62 | The deliberate-exclusion comment convention a new registry must follow, and the PAIRS precedent for gating both ends of a contract. |
| P1 | `plugins/relay/scripts/normalize-test-output.mjs` | 24, 334 | The repo's only `import.meta.url` CLI-entry guard — the exact idiom Task 2 copies. |
| P1 | `docs/context/constraints.md` | 127-146 | The degenerate-timestamp entry whose "silently counted as pre-change" sentence goes stale on merge. |
| P1 | `documentation/AGENTS.md` | §7.4 | Binding rule: every `documentation/` change needs a `changelog.html` entry. |
| P2 | `.claude/commands/efficiency-report.md` | step 2 | Enumerates the warnings a reader must not skip; a new warning not listed here is walked past. |

## Patterns to Mirror

```js
# SOURCE: scripts/efficiency.mjs:69-74
      entries.push({
        timestamp: j.timestamp ?? '',
        verdict: j.verdict ?? '',
        action: j.action ?? '',
        fails: (j.rubric ?? []).filter((r) => r.passed === false).map((r) => r.id),
      });
```
Task 1 extends this object with a `degraded` field read off the parsed JSON
(`j.timestamp_degraded === true`). This is the parse-not-grep site: the field is
read from `j`, so a prose mention of the token elsewhere in the line cannot match.

```js
# SOURCE: scripts/efficiency.mjs:115-116
/** First recorded timestamp for an artifact, or '' when unknown. */
const firstSeen = (a) => a.entries.map((e) => e.timestamp).filter(Boolean).sort()[0] ?? '';
```
Task 1 adds `hasDegradedTimestamp` immediately below, in this same one-line
doc-comment-plus-arrow style.

```js
# SOURCE: scripts/efficiency.mjs:176-178
  const before = artifacts.filter((a) => firstSeen(a) && firstSeen(a) <= snap.markerUtc);
  const after = artifacts.filter((a) => firstSeen(a) > snap.markerUtc);
  const undated = artifacts.filter((a) => !firstSeen(a));
```
Task 1 replaces this three-line partition with a call to the pure
`classifyArtifacts` Task 2 extracts, which returns `{before, after, undated,
degraded}` computed from the same predicates plus the degraded pre-filter.

```js
# SOURCE: scripts/efficiency.mjs:201-203
  if (undated.length) {
    process.stdout.write(`  WARNING - ${undated.length} artifact(s) have no usable timestamp and are excluded from both sides.\n\n`);
  }
```
Task 1 adds the degraded warning adjacent to this block, in the same
`  WARNING - ` register, but as a SEPARATE message that also names the files.

```js
# SOURCE: scripts/efficiency.mjs:239-249
const mode = process.argv[2];
if (mode === 'snapshot') doSnapshot();
else if (mode === 'compare') doCompare();
else {
  process.stderr.write(
    'Usage:\n' +
      '  node scripts/efficiency.mjs snapshot --label <version> [--note "..."]\n' +
      '  node scripts/efficiency.mjs compare [--since <version>]\n',
  );
  process.exit(2);
}
```
Task 2 wraps this block in the `import.meta.url` guard below. The dispatch body
itself is unchanged — only its reachability on import changes.

```js
# SOURCE: plugins/relay/scripts/normalize-test-output.mjs:334
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
```
The repo's only CLI-entry-guard precedent (`pathToFileURL` imported from
`node:url` at that file's line 24). Task 2 copies this idiom verbatim. Research
confirmed no such guard exists anywhere under `scripts/` — this is a new
convention for that directory, imported from an existing in-repo precedent
rather than invented.

```js
# SOURCE: scripts/validate/checks/timestamp-contract.mjs:59-67
/**
 * The seven jsonl-appending reviewers this contract covers. Every entry
 * both declares a `review_started_at` input and carries a
 * `### Timestamp discipline (mandatory)` section whose fallback branch
 * must match the reviewer's own capability.
 *
 * @type {string[]}
 */
const REVIEWERS = [
```
Task 3's `CONSUMERS` registry copies this declared-docblock-then-flat-array
shape, including the `@type {string[]}` annotation.

```js
# SOURCE: scripts/validate/checks/feedback-chain.mjs:55-58
 * `docs-updater` is deliberately absent — `/relay-implement` removed
 * `docs_prior_feedback` from its dispatch payload on purpose, and the docs
 * pair shows zero measured churn. Adding it here would assert a contract
 * that does not exist.
```
Task 3 mirrors this convention: the `CONSUMERS` docblock names, as a comment,
why `scripts/eval.mjs` and the `.claude/commands/efficiency-report.md` skill are
NOT registered — a registry omission is a reasoned decision, never a silent gap.

```js
# SOURCE: scripts/validate/checks/feedback-chain.test.mjs:66-71
function withoutLine(content, needle) {
  return content
    .split('\n')
    .filter((line) => !line.includes(needle))
    .join('\n');
}
```
The test-pair suites mirror this: every failure fixture is a MUTATION of one
passing baseline, so a test cannot pass for an unrelated reason.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `scripts/efficiency.mjs` | UPDATE | Retain + honor `timestamp_degraded`; extract the pure classifier; guard the CLI dispatch; amend the Splitting-rule / Honesty-guard docblock. |
| `scripts/validate/checks/timestamp-contract.mjs` | UPDATE | Add the `CONSUMERS` registry, the executable-reference assertion, the `WATCHED_FILES` spread entry, and the docblock/exclusion comments. |
| `docs/decisions.md` | UPDATE | Record the exclusion-over-classification decision and the rejected alternative. |
| `docs/context/constraints.md` | UPDATE | The 2026-07-31 degenerate-timestamp entry's "silently counted as pre-change" consequence goes stale; must record the new policy and distinguish flagged from unflagged populations. |
| `.claude/commands/efficiency-report.md` | UPDATE | Step 2's warning enumeration must list the new warning or the skill walks past it. |
| `documentation/reference/validation-checks.html` | UPDATE | New assertion in the `timestamp-contract` section; table row + Totals counts must reconcile with the tree. |
| `documentation/changelog.html` | UPDATE | Binding per `documentation/AGENTS.md` §7.4. |
| `scripts/validate/checks/timestamp-contract.test.mjs` | UPDATE — **test pair only** | EXISTING_TEST_UPDATED. NOT an Implementer task (R-X strict). |
| `scripts/efficiency.test.mjs` | CREATE — **test pair only** | NEW_TEST_REQUIRED. NOT an Implementer task (R-X strict). |

## NOT Building (Scope Limits)

- **No repair or backfill of the 128 historic `T00:00:00Z` entries.** Settled by
  `docs/decisions.md` [2026-07-31]: the real instants were never observed. Those
  entries carry NO flag, so they remain classified (not excluded) and the
  day-apart-boundary caveat continues to apply to them.
- **No change to any reviewer or command prompt under `plugins/relay/`.** The
  producer half is correct and shipping; this phase touches only consumers.
- **No `plugin.json` version bump.** Nothing under `plugins/relay/` changes.
- **No new efficiency snapshot marker.** `v0.25.0` remains the boundary.
- **No degraded-count field added to `snapshot` output.** `snapshot` aggregates
  the whole corpus with no before/after split, so it cannot misclassify;
  adding a field would change the recorded marker format for no measurement gain.
- **No partially-sound "classify as BEFORE when some real entry predates the
  marker" refinement.** It would sharpen only the already-approximate BEFORE
  side, never the scarce AFTER side.

## Step-by-Step Tasks

### Task 1: UPDATE `scripts/efficiency.mjs` — honor the flag

**ACTION**: Extend `readCorpus`'s pushed entry shape with `degraded: j.timestamp_degraded === true`
(read off the parsed JSON object, never by substring). Add a
`hasDegradedTimestamp` one-liner below `firstSeen`. In `doCompare`, pre-filter
degraded artifacts out of the corpus before the existing before/after/undated
partition, and emit a new warning adjacent to the undated one:

```
  WARNING - <n> artifact(s) carry a producer-flagged unreliable timestamp
  (timestamp_degraded) and are excluded from both sides:
    <file>
```

Amend the module docblock's "Splitting rule" and "Honesty guard" paragraphs to
state the exclusion policy and why exclusion was chosen over classification.

**SATISFIES**: AC-A1, AC-A2, AC-A3, AC-A4.

**MIRROR**: `# SOURCE: scripts/efficiency.mjs:69-74`, `:115-116`, `:176-178`, `:201-203`.

**VALIDATE**:
```bash
set -euo pipefail
out=$(node scripts/efficiency.mjs compare)
printf '%s' "$out" | grep -q "timestamp_degraded"
printf '%s' "$out" | grep -q "add-an-11th-static-check-to-scriptsvalidate-that.review.jsonl"
if printf '%s' "$out" | grep -q "recomputed 82"; then
  echo "FAIL: the drift line is still present - the degraded artifact is still in the before-set"; exit 1
fi
echo "PASS: degraded artifact excluded and named; snapshot drift resolved"
```

### Task 2: UPDATE `scripts/efficiency.mjs` — pure classifier + CLI guard

**ACTION**: Extract the partition into an exported pure function
`classifyArtifacts(artifacts, markerUtc)` returning
`{ before, after, undated, degraded }`, with no I/O; have `doCompare` call it.
Export `readCorpus`, `aggregate`, `firstSeen`, `hasDegradedTimestamp` and
`classifyArtifacts`. Wrap the top-level CLI dispatch in the `import.meta.url`
guard, importing `pathToFileURL` from `node:url`. The dispatch body and both
CLI modes' output are otherwise unchanged.

**SATISFIES**: AC-A5, AC-A6.

**MIRROR**: `# SOURCE: scripts/efficiency.mjs:239-249` and
`# SOURCE: plugins/relay/scripts/normalize-test-output.mjs:334`.

**VALIDATE**:
```bash
set -euo pipefail
# Fail-before gate: on the unmodified tree this exits 2 (the top-level dispatch
# runs on import and calls process.exit(2)).
node -e "import('./scripts/efficiency.mjs')"
node --input-type=module -e "
import * as m from './scripts/efficiency.mjs';
for (const n of ['classifyArtifacts','readCorpus','aggregate','firstSeen','hasDegradedTimestamp']) {
  if (typeof m[n] !== 'function') { console.error('FAIL: missing export ' + n); process.exit(1); }
}
console.log('PASS: module imports without side effects and exports the classifier');
"
# AC-A6 regression guard (passes before AND after by design — it asserts
# unchanged behaviour). `node` deliberately exits 2 here, so its status must be
# swallowed before the grep: piping it directly under `set -o pipefail` would
# make the block FAIL precisely when the implementation is correct.
usage=$(node scripts/efficiency.mjs 2>&1 || true)
printf '%s' "$usage" | grep -q "Usage:"
echo "PASS: CLI guard in place, exports present, usage path intact"
```

### Task 3: UPDATE `scripts/validate/checks/timestamp-contract.mjs` — CONSUMERS registry

**ACTION**: Add a `CONSUMERS` flat array containing `scripts/efficiency.mjs`,
with a docblock in the `REVIEWERS` style plus a deliberate-exclusion comment
naming why `scripts/eval.mjs` and `.claude/commands/efficiency-report.md` are
NOT registered (neither classifies artifacts by timestamp). Add the array to the
`WATCHED_FILES` spread. In `checkTimestampContract`, loop `CONSUMERS` and assert
each registered file references `timestamp_degraded` in EXECUTABLE code: strip
`//` line comments and `/* */` block comments first, then require at least one
remaining occurrence. A file that only documents the flag in a comment must
fail. Extend the module docblock to explain that the check now gates both ends
of the contract and why.

**SATISFIES**: AC-A7, AC-A8, AC-A9.

**MIRROR**: `# SOURCE: scripts/validate/checks/timestamp-contract.mjs:59-67` and
`# SOURCE: scripts/validate/checks/feedback-chain.mjs:55-58`.

**VALIDATE**:
```bash
set -euo pipefail
node --input-type=module -e "
import { checkTimestampContract, WATCHED_FILES } from './scripts/validate/checks/timestamp-contract.mjs';
if (!WATCHED_FILES.includes('scripts/efficiency.mjs')) { console.error('FAIL: consumer not watched'); process.exit(1); }
const commentOnly = checkTimestampContract({ files: { 'scripts/efficiency.mjs': '// mentions timestamp_degraded in a comment only\nconst x = 1;\n' }, jsonlEntries: [], marker: null });
if (commentOnly.ok) { console.error('FAIL: comment-only consumer accepted'); process.exit(1); }
const real = checkTimestampContract({ files: { 'scripts/efficiency.mjs': 'const d = e.timestamp_degraded === true;\n' }, jsonlEntries: [], marker: null });
if (!real.ok) { console.error('FAIL: genuine consumer rejected: ' + JSON.stringify(real.findings)); process.exit(1); }
console.log('PASS: CONSUMERS registry gates the consumer end in both directions');
"
npm run validate
```

### Task 4: UPDATE the three Markdown docs

**ACTION**: (a) `docs/context/constraints.md` — amend the 2026-07-31
degenerate-timestamp entry: replace the stale "silently counted as pre-change"
consequence with the exclusion policy, and state explicitly that the 128
historic entries carry no flag, so they are still classified and the
day-apart-boundary caveat still applies to them. (b) `docs/decisions.md` — add a
dated entry in the house Context / Decision / Reason format recording exclusion
over classify-with-a-warning and naming the rejected alternative. The entry's
heading MUST contain the literal phrase `excludes its artifact from
before/after classification`, and its Reason MUST name the rejected
`classify-with-a-warning` alternative using that literal hyphenated token —
both phrases are absent from `docs/decisions.md` today (verified at commit
`5302839`), which is what makes Task 4's VALIDATE non-vacuous. A bare grep for
`timestamp_degraded` would NOT work here: that token already appears twice in
the pre-existing `[2026-07-31]` entry, so it is satisfied identically before
and after this task. (c)
`.claude/commands/efficiency-report.md` — add the new warning to step 2's
enumeration, in the same register as the three bullets already there.

**SATISFIES**: AC-A10, AC-A11, AC-A12.

**MIRROR**: the existing `## [2026-07-31] Reviewer jsonl timestamps ...` entry
at `docs/decisions.md:1318-1376` is the format template.

**VALIDATE**:
```bash
set -euo pipefail
norm() { tr -d '\r' < "$1" | tr '\n' ' ' | tr -s ' '; }
norm docs/context/constraints.md | grep -q "excluded from both the before and after sets"
norm docs/context/constraints.md | grep -q "carry no flag"
# NOT a bare `timestamp_degraded` grep — that token is already present twice in
# docs/decisions.md's pre-existing [2026-07-31] entry and would be vacuous.
# These two phrases are absent from the file at commit 5302839.
norm docs/decisions.md | grep -q "excludes its artifact from before/after classification"
norm docs/decisions.md | grep -q "classify-with-a-warning"
norm .claude/commands/efficiency-report.md | grep -q "timestamp_degraded"
if norm docs/context/constraints.md | grep -q "and is silently counted as pre-change"; then
  echo "FAIL: the stale pre-change consequence sentence survives in constraints.md"; exit 1
fi
echo "PASS: all three docs updated and the stale sentence is gone"
```

### Task 5: UPDATE `documentation/` — prose and changelog

**ACTION**: In `documentation/reference/validation-checks.html`, extend the
`timestamp-contract` section prose to describe the `CONSUMERS` registry and the
comment-stripping executable-reference assertion; add a table row for the new
`scripts/efficiency.test.mjs` suite (mirroring the existing non-check `eval
layer` row so the Totals line stays equal to the sum of rows). Add a
`documentation/changelog.html` entry per `documentation/AGENTS.md` §7.4.

**Numeric counts are NOT part of this task.** `tdd: false` means the test pair
runs after the Implementer, so neither the new `scripts/efficiency.test.mjs`
count nor the updated `timestamp-contract` count exists yet. Writing a number
now would be guessing, which the plan forbids. Leave the new row's count cell
and the `Totals:` line at whatever placeholder the prose edit produces; the
`### Post-implementation gate` under `## Notes` reconciles every count against the tree
once both suites exist, and fails if any of them disagrees.

**SATISFIES**: AC-A13 (prose half; the numeric half is discharged by the
post-implementation gate).

**MIRROR**: the existing `<tr>` rows and `Totals:` line at
`documentation/reference/validation-checks.html:38-53`.

**VALIDATE**:
```bash
set -euo pipefail
HTML=documentation/reference/validation-checks.html
tr -d '\r' < "$HTML" | tr '\n' ' ' | tr -s ' ' | grep -q "CONSUMERS"
tr -d '\r' < documentation/changelog.html | tr '\n' ' ' | tr -s ' ' | grep -qi "consumer half"
# Assert a real <tr> row, not merely the anchor appearing somewhere on the
# page — the post-implementation gate's row_count lookup depends on the row.
tr -d '\r' < "$HTML" | grep -qE '<tr><td><a href="#efficiency-metrics">'
# Both test-pair suites are named here so the files this plan expects the test
# pair to author are visible inside the task list itself, not only in a later
# section. They are deliberately NOT run here: `tdd: false` means test-after,
# so they may not exist yet. The strict two-suite run and the full count
# reconciliation live in `### Post-implementation gate` under `## Notes`.
for t in scripts/efficiency.test.mjs scripts/validate/checks/timestamp-contract.test.mjs; do
  if [ -f "$t" ]; then echo "present: $t"; else echo "DEFERRED to the test pair: $t"; fi
done
echo "PASS: documentation prose, new table row and changelog entry present"
```

## Validation Commands

### Level 1 — STATIC_ANALYSIS

```bash
set -euo pipefail
node --check scripts/efficiency.mjs
node --check scripts/validate/checks/timestamp-contract.mjs
# Importing the module must have NO side effects. On the unmodified tree this
# exits 2 (the top-level dispatch runs and calls process.exit(2)).
node -e "import('./scripts/efficiency.mjs')"
echo "PASS: both modules parse and efficiency.mjs is importable without side effects"
```

### Level 2 — UNIT_TESTS

`docs/context/methodology.md` declares `tdd: false`, so the test pair runs
AFTER the Implementer and Code Review. `scripts/efficiency.test.mjs` therefore
does not exist while the Implementer runs these levels, and this block must not
demand it — a Level that cannot pass at the moment it is evaluated is an
always-fail gate, exactly as defective as an always-pass one. The block below
runs what exists and narrates the deferral out loud rather than hiding it; the
strict two-suite gate is the post-test-pair gate in `## Post-implementation
gate` below, and is what AC-A14 is actually judged on.

```bash
set -euo pipefail
# Regression gate: the existing suite must survive Task 3's registry change.
# Its two WATCHED_FILES tests assert inclusion + no-duplicates, not exact
# contents, so adding a consumer path is expected to keep them green.
node --test scripts/validate/checks/timestamp-contract.test.mjs
if [ -f scripts/efficiency.test.mjs ]; then
  node --test scripts/efficiency.test.mjs
else
  echo "DEFERRED: scripts/efficiency.test.mjs is not authored yet (tdd: false =="
  echo "  test-after; the test pair authors it after Code Review). The strict"
  echo "  two-suite gate is '## Post-implementation gate' below."
fi
```

Glob form only — `node --test <dir>` yields `MODULE_NOT_FOUND` in this repo.

### Level 3 — INTEGRATION

```bash
set -euo pipefail
npm run validate
out=$(node scripts/efficiency.mjs compare)
printf '%s' "$out" | grep -q "timestamp_degraded"
printf '%s' "$out" | grep -q "add-an-11th-static-check-to-scriptsvalidate-that.review.jsonl"
if printf '%s' "$out" | grep -q "recomputed 82"; then
  echo "FAIL: snapshot drift persists - the degraded artifact is still classified"; exit 1
fi
node scripts/efficiency.mjs snapshot --label __probe >/dev/null
rm -f PRPs/reports/efficiency/__probe.json
echo "PASS: validate green, compare honors the flag, snapshot mode still functional"
```

The `__probe` snapshot round-trip proves Task 2's CLI guard did not break
`snapshot` mode, and removes the throwaway marker so the corpus is unchanged.

## Acceptance Criteria

R8b (PRD AC-N token check) does not apply in description mode.

- **AC-A1:** `readCorpus` retains a per-entry `degraded` boolean parsed from the
  JSON object's `timestamp_degraded` field; a file containing the token only
  inside a prose `reason` string is NOT treated as degraded.
- **AC-A2:** An artifact any of whose entries is degraded appears in neither the
  before nor the after aggregate produced by `compare`.
- **AC-A3:** `compare` prints a `WARNING -` line, distinct from the undated
  warning, that states the count AND names each excluded artifact file.
- **AC-A4:** After the change, `node scripts/efficiency.mjs compare` no longer
  prints `plan-review: snapshot recorded 81 artifacts, recomputed 82`.
- **AC-A5:** `scripts/efficiency.mjs` can be imported without executing its CLI
  dispatch, and exports `classifyArtifacts`, `readCorpus`, `aggregate`,
  `firstSeen` and `hasDegradedTimestamp`.
- **AC-A6:** Both CLI modes behave as before: `snapshot --label X` still writes
  a marker, and a bare invocation still prints usage and exits non-zero.
- **AC-A7:** `timestamp-contract.mjs` carries a `CONSUMERS` registry including
  `scripts/efficiency.mjs`, present in `WATCHED_FILES`.
- **AC-A8:** The consumer assertion fails a registered consumer that references
  `timestamp_degraded` only inside a comment, and passes one that references it
  in executable code.
- **AC-A9:** Registry omissions from `CONSUMERS` are carried as an explanatory
  comment, never as a silent gap.
- **AC-A10:** `docs/context/constraints.md` no longer asserts that
  `efficiency.mjs` silently counts flagged artifacts as pre-change, and states
  that the 128 unflagged historic entries remain classified.
- **AC-A11:** `docs/decisions.md` records the exclusion policy, the rejected
  classify-with-a-warning alternative, and the reason.
- **AC-A12:** `.claude/commands/efficiency-report.md` step 2 enumerates the new
  warning alongside the three warnings already listed.
- **AC-A13 (prose, implement time):** `documentation/reference/validation-checks.html`
  describes the consumer assertion and carries a row for the new efficiency
  suite; `documentation/changelog.html` carries an entry.
- **AC-A14 (numeric, post-test-pair):** every per-row count, the `Totals:` line
  and the registered-check count in
  `documentation/reference/validation-checks.html` reconcile against the tree,
  and `node --test scripts/efficiency.test.mjs
  scripts/validate/checks/timestamp-contract.test.mjs` is green. Judged by the
  `## Post-implementation gate`, not at implement time — the suites do not exist
  until the test pair has run.
- **AC-A15:** `npm run validate` reports all checks PASS.
- **AC-A16:** The Implementer authors zero test files; both suites are produced
  by the test-writer/test-reviewer pair.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| The exclusion silently shrinks the already-scarce AFTER sample, hiding the wave-2 signal. | Medium | Medium | The new warning names every excluded file, so a shrinking sample is visible rather than absent. AC-A3 requires naming, not just counting. |
| A substring implementation matches the prose mention of `timestamp_degraded` in `fix-degenerate-t000000-timestamps-in-relay-reviewer-jsonl.code-review.jsonl` and over-excludes. | Medium | High | AC-A1 mandates parsing the field off the JSON object; the test-pair suite carries an explicit prose-mention decoy case. |
| The `import.meta.url` guard breaks the `/efficiency-report` skill, which shells out via an `allowed-tools` Bash pattern. | Low | High | Level 3 exercises both CLI modes end to end, including a `snapshot` round-trip; Task 2's VALIDATE asserts the usage path still fires. |
| The `CONSUMERS` assertion is vacuous (passes for any file). | Medium | Medium | Task 3's VALIDATE asserts BOTH directions inline — a comment-only fixture must fail and a real one must pass — so a vacuous implementation cannot satisfy it. |
| `documentation/` counts are written before the test suites land and are wrong. | Medium | Low | Task 5 is scoped to prose + changelog + the new row and writes no counts at all. Every count is recomputed from the tree by `### Post-implementation gate` under `## Notes`, which runs only after the test pair has authored both suites. |
| research-web was not dispatched, so no external convention was consulted. | High | Low | Documented in `## Notes` rather than left implicit. This is an internal metrics-tooling change against this repo's own audit logs; there is no external practice to import. |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.

- **R-X strict.** `test_frameworks: ["node:test"]` is declared, so the test pair
  is ACTIVE in test-after mode. `scripts/efficiency.test.mjs` and
  `scripts/validate/checks/timestamp-contract.test.mjs` are test-pair work
  (NEW_TEST_REQUIRED and EXISTING_TEST_UPDATED respectively). The Implementer
  authors neither. No `### Task` above authors or edits either file — Task 5's
  VALIDATE names both paths only to report each as present-or-deferred, which is
  a presence check, not authorship.

- **Why exclusion, not classify-with-a-warning.** The `timestamp_degraded` flag
  declares the stamp a placeholder. `efficiency.mjs` already has an idiom for
  "no usable timestamp — excluded from both sides, count reported" (the
  `undated` bucket), so this reuses an existing mechanism rather than inventing a
  second doubt-signalling one. Classifying-with-a-warning would keep a
  known-wrong number in the headline and rely on the reader to discount it,
  which is exactly what the tool's existing small-sample and drift cautions
  exist to avoid. Over-exclusion is the safe direction; trusting the value is
  the forbidden one.

- **Why the validate check gains a consumer assertion.** `timestamp-contract`
  gated only that reviewers EMIT the flag. Nothing verified any consumer HONORS
  it — which is how this gap shipped in the same session that built the check.
  `feedback-chain.mjs`'s `PAIRS` registry is the in-repo precedent for gating
  both ends of a contract rather than one.

- **Independent confirmation of the diagnosis.** Excluding the single degraded
  artifact returns the recomputed before-set to 81, exactly matching what the
  `v0.25.0` snapshot recorded. The disappearance of the drift warning is
  therefore a consequence of the fix, not a masking of it — which is why AC-A4
  asserts its absence rather than merely asserting the new warning's presence.

- **Grounding.** `research-codebase` was dispatched and returned eight findings,
  including the load-bearing negative finding that no `import.meta.url`
  CLI-entry guard exists anywhere under `scripts/` — the only in-repo precedent
  is `plugins/relay/scripts/normalize-test-output.mjs:334`, which Task 2
  therefore imports rather than inventing a new idiom. `research-web` was NOT
  dispatched: this phase changes internal metrics tooling that reads this
  repo's own audit logs, and has no external-convention surface. Recorded here
  rather than silently omitted.

- **Every VALIDATE command in this plan was run against the unmodified tree at
  commit `5302839` before this plan was written**, and each fails there:
  `node -e "import('./scripts/efficiency.mjs')"` exits 2; the degraded-warning
  grep exits 1; `recomputed 82` is PRESENT (so the Task 1 / Level 3 inverse
  assertion is live, not vacuous); `node --test scripts/efficiency.test.mjs`
  exits 1; the `WATCHED_FILES` and comment-only-consumer probes both exit 1;
  and all five CRLF-normalised doc greps exit 1. Two commands are deliberately
  NOT fail-before, and are labelled as such inline rather than left ambiguous:
  `npm run validate` exits 0 at baseline and must stay green (paired with
  fail-before assertions in the same Level 3 block), and Task 2's `Usage:`
  probe is an AC-A6 regression guard asserting unchanged behaviour.

- **Reviewer round 1 (`plan-reviewer`, 2026-07-31) found two real
  validation-command defects, both fixed above.** (i) Task 2 originally piped
  `node scripts/efficiency.mjs 2>&1 | grep -q "Usage:"` under `set -o pipefail`;
  since `node` intentionally exits 2 on the usage path, `pipefail` propagated
  that 2 as the block's status even when `grep` matched — an ALWAYS-FAIL command
  that would have reported failure precisely when the implementation was
  correct. Confirmed independently: `bash -c 'set -euo pipefail; node
  scripts/efficiency.mjs 2>&1 | grep -q "Usage:"'` exits 2, the same pipeline
  without `pipefail` exits 0. Now captured via `$(... || true)` before grepping.
  (ii) Task 4 originally asserted `grep -q "timestamp_degraded"` against
  `docs/decisions.md`; that token already occurs twice in the pre-existing
  `[2026-07-31]` entry, so the assertion was vacuous — satisfied identically
  before and after. Replaced with two phrases verified absent at commit
  `5302839`. The reviewer's third finding (R-COH-FILES-UNTOUCHED against
  `scripts/validate/checks/timestamp-contract.test.mjs`) did not reproduce at
  the time: the path was then inside `## Step-by-Step Tasks`, in Task 5's own
  VALIDATE block. The sequencing fix below later moved that block out, which
  DID make the finding real — see the round-3 note.

- **Sequencing defect found and fixed before dispatching the Implementer
  (2026-07-31, self-caught).** The first APPROVED revision put
  `node --test scripts/efficiency.test.mjs` in `## Validation Commands` Level 2
  and the documentation count reconciliation in Task 5. Under `tdd: false` the
  test pair runs AFTER the Implementer and Code Review, so that suite does not
  exist while the Implementer evaluates Levels 1-3 — both would have failed for
  a reason no Implementer edit could fix, burning the whole
  `max_implement_retries` budget and terminating in `FAILED_AFTER_N_RETRIES`.
  A gate that cannot PASS when it is evaluated is exactly as defective as one
  that cannot FAIL, and this plan's own review protocol only checked the latter
  direction. Fixed by splitting the two populations: Level 2 now runs the
  existing suite (a genuine regression gate — Task 3 changes `WATCHED_FILES`,
  whose two shape tests assert inclusion and no-duplicates rather than exact
  contents, so they are expected to stay green) and narrates the deferral out
  loud; Task 5 is scoped to prose + changelog only; and the strict two-suite run
  plus the full count reconciliation moved to `## Post-implementation gate`,
  which is explicitly not an Implementer task. AC-A13/AC-A14 were split along
  the same seam so no acceptance criterion is judged before it can be.

- **Round 3 caught three regressions introduced by that very fix, all fixed
  here.** Moving the reconciliation block out of Task 5 removed the only
  reference to either test-pair file from `## Step-by-Step Tasks`, so
  `R-COH-FILES-UNTOUCHED` — whose scope is that section alone — went from
  passing to failing; Task 5's VALIDATE now names both suites explicitly (and
  runs neither, since `tdd: false` means they may not exist yet). Two sentences
  also went stale in the same move: the round-1 recap above, and the
  `## Risks and Mitigations` row that still credited Task 5's VALIDATE with
  recomputing the counts. The reviewer additionally judged a top-level
  `## Post-implementation gate` to pass R2 only on a literal reading, and
  recommended demoting it; it is now `### Post-implementation gate` under
  `## Notes`, so the canonical 15-section schema is untouched. The general
  lesson, worth more than the three fixes: relocating content between sections
  silently changes which section-scoped rubric checks can see it, and stale
  cross-references are the cost of every such move.

- **Commit directly on `development`; do not push.**

### Post-implementation gate

Run this AFTER the test pair has authored both suites and AFTER the numeric
counts in `documentation/reference/validation-checks.html` have been brought in
line with the tree. It is the strict form of Level 2 and of Task 5's numeric
half, and it is what AC-A13's numeric clause and AC-A14 are judged on. It is
deliberately NOT an Implementer task: it cannot pass at implement time, and a
gate that cannot pass when it is evaluated is as defective as one that cannot
fail.

```bash
set -euo pipefail
node --test scripts/efficiency.test.mjs scripts/validate/checks/timestamp-contract.test.mjs
HTML=documentation/reference/validation-checks.html
row_count() { tr -d '\r' < "$HTML" | grep "href=\"#$1\"" | grep -oE '<td>[0-9]+</td>' | tail -1 | grep -oE '[0-9]+'; }
sum=0; fail=0
check_row() {
  want=$(grep -c '^test(' "$2"); got=$(row_count "$1"); sum=$((sum + ${got:-0}))
  [ "${got:-x}" = "$want" ] || { echo "FAIL: row #$1 says '${got:-<none>}', tree has $want"; fail=1; }
}
check_row version-parity      scripts/validate/checks/version-parity.test.mjs
check_row native-validate     scripts/validate/checks/native-validate.test.mjs
check_row registration-parity scripts/validate/checks/registration-parity.test.mjs
check_row path-existence      scripts/validate/checks/path-existence.test.mjs
check_row dispatch-graph      scripts/validate/checks/dispatch-graph.test.mjs
check_row frontmatter-schema  scripts/validate/checks/frontmatter-schema.test.mjs
check_row artifact-naming     scripts/validate/checks/artifact-naming.test.mjs
check_row bootstrap-parity    scripts/validate/checks/bootstrap-parity.test.mjs
check_row gating-structure    scripts/validate/checks/gating-structure.test.mjs
check_row feedback-chain      scripts/validate/checks/feedback-chain.test.mjs
check_row timestamp-contract  scripts/validate/checks/timestamp-contract.test.mjs
check_row efficiency-metrics  scripts/efficiency.test.mjs
check_row eval-layer          scripts/eval.test.mjs
doc_total=$(tr -d '\r' < "$HTML" | grep -oE 'Totals:</strong> [0-9]+' | grep -oE '[0-9]+')
[ "$doc_total" = "$sum" ] || { echo "FAIL: Totals says $doc_total, rows sum to $sum"; fail=1; }
n=$(sed -n '/const CHECKS = \[/,/^\];/p' scripts/validate/index.mjs | grep -c '^  run')
d=$(tr -d '\r' < "$HTML" | grep -oE 'reports [0-9]+ checks' | grep -oE '[0-9]+')
[ "$d" = "$n" ] || { echo "FAIL: page says $d checks, index.mjs registers $n"; fail=1; }
[ "$fail" = 0 ] || exit 1
echo "PASS: documentation prose, per-row counts, totals and check count all reconcile"
```

*Generated: 2026-07-31*
*Approved: 2026-07-31*
*Implemented: 2026-07-31*
*Status: IMPLEMENTED*
