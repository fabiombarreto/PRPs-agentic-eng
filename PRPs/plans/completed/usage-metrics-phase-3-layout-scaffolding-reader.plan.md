# Feature: Layout scaffolding + reader (Phase 3 of usage-metrics)

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting artifact creation; establishes the first project-owned .gitattributes convention; adds a consumer surface to a shipped script
- Decisions found:
  - [2026-08-13] Per-project plugin-usage metrics artifacts — decision points 3 (location + lifecycle) and 6 (consumer side) are what this phase answers
  - [2026-04-19] PRP artifacts live under `PRPs/`, never under `.claude/`
  - [2026-08-05] Rework is counted per review session — the reader must not contradict `efficiency.mjs`'s own reading of the same corpus
- Applicable anti-patterns:
  - Writing pipeline artifacts under `.claude/`
  - Any reading of metrics by a pipeline agent — the `-diff` rule this phase ships is the structural guard for the channel a grep cannot see
- Applicable architectural rules:
  - Shipped scripts live at `plugins/relay/scripts/`; the artifact lives under `PRPs/` at the target project root
  - Interactivity boundary: autonomous
- Result: PROCEED
```

## Source

- `PRPs/prds/usage-metrics.prd.md` — Implementation Phases row 3: "Layout scaffolding + reader" — Goal: make the artifact durable, portable, and readable by its owner — Success signal: AC-4 and AC-6 pass.

## Summary

This phase makes the materialized artifact durable and readable. It scaffolds `PRPs/metrics/` with two git control files — a `.gitattributes` marking the shards `-diff` and `text eol=lf`, and a defensive `.gitignore` re-include — and adds a `query` subcommand to the already-shipped materializer so the person whose project holds the data can read it without a relay checkout. The `-diff` rule is the load-bearing part: grounding confirmed that `/relay-implement` writes a full `git diff <base_commit>` into `diff.patch` and hands it to the code-reviewer, test-runner and visual-verifier, so without it a plan that touches the shards would feed metric values straight into a reviewer's context — the exact anti-Goodhart breach no grep can detect.

## User Story

As the owner of a project that has materialized usage metrics
I want the shards committed, protected from diff-reading tooling, and queryable from the shipped script
So that the data survives a clone, never leaks into an agent's context, and can be read without cloning relay.

## Problem Statement

Phase 2 produces shards but nothing guarantees they survive or stay out of the wrong context. Three concrete gaps: a target repository carrying a blanket `*.tsv` ignore would silently track zero bytes; a Windows checkout can reintroduce CRLF into files the materializer promises are LF-only, breaking byte-identity at the checkout layer rather than the content layer; and the shards are ordinary text to git, so any command that reads a working-tree diff ingests their values.

## Solution Statement

Two scaffolded control files and one subcommand. `PRPs/metrics/.gitattributes` marks `*.tsv` as `-diff` (git renders a binary-file notice instead of the content) and `text eol=lf` (the checkout-layer complement to `renderShard`'s literal `\n`). `PRPs/metrics/.gitignore` carries an explicit re-include, which grounding confirmed is effective here: the directory-exclusion trap the root `.gitignore` documents applies only when a parent *directory* is excluded, not when a filename pattern matches. The `query` subcommand follows the script's own existing positional-token precedent (`materialize` is already parsed that way) rather than importing `efficiency.mjs`'s `argv[2]` convention, and reports per-stage counts with the degraded-row exclusion surfaced as a named warning, mirroring `doCompare()`.

## Metadata

| Key | Value |
|-----|-------|
| Type | Scaffolding + consumer surface |
| Complexity | Medium |
| Systems Affected | `PRPs/metrics/` (two new control files); `plugins/relay/scripts/usage-metrics.mjs` (new subcommand) |
| Dependencies | Phase 2 (the materializer and its shards) |
| Estimated Tasks | 4 |
| Source PRD line ref | `PRPs/prds/usage-metrics.prd.md` Implementation Phases row 3 |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `plugins/relay/commands/relay-implement.md` | 299-301 | The concrete leak point: `git diff <base_commit>` written to `diff.patch`, then handed to the code-reviewer, test-runner and visual-verifier. This is what `-diff` protects. |
| P0 | `.gitignore` | 22-36 | The repo's own documented directory-exclusion trap, and the two working re-include idioms. Grounding confirmed the trap does not apply to a filename-pattern rule. |
| P0 | `plugins/relay/scripts/usage-metrics.mjs` | 421-437 | The existing `parseArgs` loop, which already accepts `materialize` as a positional token — the precedent the `query` subcommand extends. |
| P1 | `scripts/efficiency.mjs` | 296-366 | `doCompare()`'s hand-formatted per-stage report and its named degraded-exclusion warning block — the output shape to mirror. |
| P1 | `plugins/relay/commands/relay-commit.md` | 199-211 | Current-branch mode's plain `git diff` / `git diff --staged`, a second command whose context `-diff` protects. |

## Patterns to Mirror

```
# SOURCE: plugins/relay/commands/relay-implement.md:299-301
  Run `git diff <base_commit>` and write the result to
  `<artifact_root><attempt>/diff.patch` (creating parent directories as needed).
```
Task 1 exists because of this line: an untagged TSV shard in a phase's diff is dumped verbatim into a file three agents then read.

```
# SOURCE: .gitignore:22-36
  git never descends into an excluded DIRECTORY, so a `!` re-include under
  `.claude/` or `PRPs/reports/` would silently do nothing.
```
Task 2 mirrors the repo's own warning, and records why it does not apply to the filename-pattern case this file defends against.

```
# SOURCE: plugins/relay/scripts/usage-metrics.mjs:421-437
  if (a === '--dry-run') mode = 'dry-run';
  else if (a === 'materialize') mode = 'materialize';
```
Task 3 adds `query` to this same loop rather than importing a second CLI convention into one script.

```
# SOURCE: scripts/efficiency.mjs:296-366
  WARNING - ${degraded.length} artifact(s) carry a producer-flagged unreliable
  timestamp (timestamp_degraded) and are excluded from both sides:
```
Task 3's report mirrors this: the exclusion is printed as a named warning, never folded silently into the counts.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `PRPs/metrics/.gitattributes` | CREATE | Marks the shards `-diff` and `text eol=lf`. The repo's first project-owned `.gitattributes`. |
| `PRPs/metrics/.gitignore` | CREATE | Defensive re-include so a target repo with a blanket `*.tsv` ignore still tracks the shards. |
| `plugins/relay/scripts/usage-metrics.mjs` | UPDATE | Adds the `query` subcommand — the consumer surface, shipped with the plugin so the data's owner needs no relay checkout. |

## NOT Building (Scope Limits)

- **Any `validate` check or `CONSUMERS` registration.** Phase 4.
- **Retention, rotation, or compaction of old shards.** Registered as an open question in the source PRD; not scoped to any phase yet.
- **A rendering, dashboard, or chart layer.** The PRD excludes it outright — the artifact is raw data and interpretation is the consumer's job.
- **Wiring the query subcommand into any relay command.** Grounding confirmed no command references the script today; keeping it operator-invoked preserves the zero-token collection path.
- **Protecting the diff channel inside `code-reviewer`'s own shell-out.** `/relay-code-review` hands `diff_target` to the agent, which computes the diff itself; `-diff` applies wherever git renders, so the protection holds, but this phase verifies it only at the `git diff` layer it can observe.

## Step-by-Step Tasks

### Task 1: CREATE PRPs/metrics/.gitattributes

- **ACTION**: Create the file with a comment block explaining both rules and two attribute lines. `*.tsv -diff` so git renders a binary-file notice instead of shard content in every `git diff`, which is what keeps metric values out of `/relay-implement`'s `diff.patch` and out of `/relay-commit`'s and `/relay-qa-report`'s diff reads — the anti-Goodhart channel a prompt-scanning grep cannot see. `*.tsv text eol=lf` so a Windows checkout cannot reintroduce CRLF into files `renderShard` already writes with a literal `\n`; this is the checkout-layer complement to the content-layer guarantee. Delivers AC-A1.
- **MIRROR**: `# SOURCE: plugins/relay/commands/relay-implement.md:299-301`.
- **VALIDATE**:
  ```bash
  set -euo pipefail
  F=PRPs/metrics/.gitattributes
  test -f "$F" || { echo "FAIL: $F absent"; exit 1; }
  grep -q '^\*\.tsv .*-diff' "$F" || { echo "FAIL: -diff rule missing"; exit 1; }
  grep -q 'eol=lf' "$F" || { echo "FAIL: eol=lf rule missing"; exit 1; }
  echo "PASS: gitattributes rules present"
  ```

### Task 2: CREATE PRPs/metrics/.gitignore

- **ACTION**: Create the file with an explicit re-include for the shard extensions (`!*.tsv`) and a comment recording why it is needed and why it works. Needed: a target repository carrying a blanket `*.tsv` or `*.csv` ignore — routine in data and ML projects — would otherwise track zero bytes, silently voiding the entire tracked-by-default rationale. Works: the root `.gitignore`'s documented trap ("git never descends into an excluded DIRECTORY") applies only when a parent directory is excluded; a filename-pattern rule leaves the directory itself traversable, so git still reads this nested file. Delivers AC-A2.
- **MIRROR**: `# SOURCE: .gitignore:22-36`.
- **VALIDATE**:
  ```bash
  set -euo pipefail
  F=PRPs/metrics/.gitignore
  test -f "$F" || { echo "FAIL: $F absent"; exit 1; }
  grep -q '^!\*\.tsv$' "$F" || { echo "FAIL: re-include missing"; exit 1; }
  grep -q 'excluded DIRECTORY' "$F" || { echo "FAIL: rationale not recorded"; exit 1; }
  echo "PASS: defensive re-include present"
  ```

### Task 3: UPDATE plugins/relay/scripts/usage-metrics.mjs — query subcommand

- **ACTION**: Add `query` to `parseArgs`'s existing positional-token branch and a `doQuery` function that reads the materialized shards from the output directory and prints a per-stage summary: verdict count, first-attempt failure count, and the top failing rubric ids per stage. Degraded rows are excluded from every rate and the exclusion is printed as a named warning naming the count, never folded silently into the totals. When no shards exist, print a single line saying so and exit 0 rather than erroring — an unmaterialized project is a normal state, not a failure. Delivers AC-A3.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/usage-metrics.mjs:421-437` and `# SOURCE: scripts/efficiency.mjs:296-366`.
- **VALIDATE**:
  ```bash
  set -euo pipefail
  F=plugins/relay/scripts/usage-metrics.mjs
  node --check "$F" || { echo "FAIL: syntax"; exit 1; }
  grep -q "function doQuery" "$F" || { echo "FAIL: doQuery missing"; exit 1; }
  grep -q "'query'" "$F" || { echo "FAIL: query token not parsed"; exit 1; }
  node "$F" query >/dev/null || { echo "FAIL: query errored"; exit 1; }
  echo "PASS: query subcommand works"
  ```

### Task 4: Verify -diff actually suppresses shard content in a real git diff

- **ACTION**: Empirically confirm the protection rather than assuming it. Stage the metrics directory, modify one shard, and run `git diff` against it; confirm git reports the file as binary rather than emitting its rows. This is the observable behind PRD AC-6 and the only way to know the attribute is in force — an attribute file that is present but not matching would pass Task 1's grep while protecting nothing. This task delivers no acceptance criterion of its own; it is the verification that AC-A1's rule has real effect.
- **MIRROR**: `# SOURCE: plugins/relay/commands/relay-implement.md:299-301` — the command whose capture this protects.
- **VALIDATE**:
  ```bash
  set -euo pipefail
  git add -N PRPs/metrics/ 2>/dev/null || true
  OUT=$(git diff -- PRPs/metrics/scan-v1.tsv || true)
  if printf '%s' "$OUT" | grep -q '^+.*PRPs-agentic-eng'; then
    echo "FAIL: shard row content appears in git diff output — -diff is not in force"; exit 1
  fi
  echo "PASS: shard content is suppressed in git diff"
  ```

## Validation Commands

**Level 1 STATIC_ANALYSIS**

```bash
set -euo pipefail
node --check plugins/relay/scripts/usage-metrics.mjs || { echo "FAIL: syntax"; exit 1; }
test -f PRPs/metrics/.gitattributes || { echo "FAIL: .gitattributes absent"; exit 1; }
test -f PRPs/metrics/.gitignore || { echo "FAIL: .gitignore absent"; exit 1; }
echo "PASS: static analysis clean"
```

**Level 2 UNIT_TESTS**

```bash
set -euo pipefail
node --test "scripts/validate/checks/usage-metrics-phase*.test.mjs" \
  || { echo "FAIL: usage-metrics suites are red"; exit 1; }
echo "PASS: unit tests green"
```

**Level 3 INTEGRATION**

```bash
set -euo pipefail
# Materialize, then query, then confirm materialize is still byte-identical.
node plugins/relay/scripts/usage-metrics.mjs materialize >/dev/null \
  || { echo "FAIL: materialize errored"; exit 1; }
H1=$(find PRPs/metrics -name '*.tsv' -type f | sort | xargs sha256sum | sha256sum)
node plugins/relay/scripts/usage-metrics.mjs query >/dev/null \
  || { echo "FAIL: query errored"; exit 1; }
H2=$(find PRPs/metrics -name '*.tsv' -type f | sort | xargs sha256sum | sha256sum)
test "$H1" = "$H2" || { echo "FAIL: query mutated the shards — it must be read-only"; exit 1; }
npm run validate || { echo "FAIL: npm run validate is red"; exit 1; }
node --test "scripts/validate/checks/*.test.mjs" || { echo "FAIL: corpus regression"; exit 1; }
echo "PASS: integration green"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-6):** Given a committed `PRPs/metrics/` with the scaffolded `.gitattributes`, when `git diff` is taken over a changed shard, then git reports the file as differing without emitting any of its rows, so no diff-reading command can ingest metric values.
- **AC-A2 (PRD AC-2):** Given a target repository whose root `.gitignore` carries a blanket `*.tsv` rule, when the scaffolded `PRPs/metrics/.gitignore` is present, then the shards are still tracked, because a filename-pattern rule leaves the directory traversable and git reads the nested file.
- **AC-A3 (PRD AC-4):** Given materialized shards from more than one project concatenated into one directory, when `query` runs, then it reports per-stage counts attributable per project via the `proj` column, and prints the degraded-row exclusion as a named warning rather than folding it into the totals.
- **AC-A4 (PRD AC-1):** Given materialized shards, when `query` runs, then no shard changes — the reader is strictly read-only and a subsequent hash comparison is identical.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| `.gitattributes` present but not matching (wrong pattern, wrong directory), protecting nothing while passing a presence grep | M | H | Task 4 verifies the effect empirically against a real `git diff`, not the file's existence |
| `-diff` does not protect the channel where `code-reviewer` shells out to git itself | M | M | Recorded in `## NOT Building`: the attribute applies wherever git renders, so protection holds, but this phase verifies only the layer it can observe |
| A future contributor removes the attribute file without knowing what it guards | M | H | The file's own comment names the three commands whose context it protects; Phase 4 adds the standing check |
| The nested re-include is a no-op under some root-rule shape not present here | L | M | Grounding established the precise semantics: the trap is directory-exclusion only. Recorded in the file's comment so the reasoning survives |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- Validation blocks use explicit `|| { echo "FAIL: …"; exit 1; }` guards rather than relying on `set -e` alone, for the reason established and verified in Phase 1: `set -e` does not propagate inside a subshell in this repository's shell.
- Task 4's VALIDATE greps for a row value (`PRPs-agentic-eng`, the `proj` column's actual value in this repo's shards) rather than for a generic marker, because the failure being tested is precisely that row content leaks into diff output.

*Generated: 2026-08-13*
*Approved: 2026-08-13*
*Status: IMPLEMENTED*
