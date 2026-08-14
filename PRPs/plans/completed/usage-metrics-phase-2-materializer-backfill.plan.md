# Feature: Materializer + backfill (Phase 2 of usage-metrics)

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting artifact creation (a shipped executable that writes a durable artifact into every target project); reads the corpus another shipped consumer already reads
- Decisions found:
  - [2026-08-13] Per-project plugin-usage metrics artifacts — decision points 2 (emission point + format) and 5 (backward compatibility with existing corpora) are what this phase answers
  - [2026-07-31] A degraded timestamp excludes its artifact from both sides — never rewrite history
  - [2026-08-05] Rework is counted per review session, not per jsonl file — the session-splitting rule this phase's reader must not contradict
  - [2026-04-19] PRP artifacts live under `PRPs/`, never under `.claude/`
- Applicable anti-patterns:
  - Writing pipeline artifacts under `.claude/`
  - Emitting secret values in run reports or logs — the closed field contract is the structural answer, and this phase is where it is enforced in code
- Applicable architectural rules:
  - Shipped scripts live at `plugins/relay/scripts/` and are invoked as `${CLAUDE_PLUGIN_ROOT}/scripts/<name>.mjs`; repo-local scripts live at `scripts/` and are wired through npm scripts
  - Node `>=18`, `type: module`, `.mjs`, synchronous `node:`-prefixed builtins, no npm dependencies
  - Interactivity boundary: this phase runs autonomously
- Result: PROCEED
```

## Source

- `PRPs/prds/usage-metrics.prd.md` — Implementation Phases row 2: "Materializer + backfill" — Goal: produce the tables deterministically from artifacts that already exist — Success signal: AC-1 and AC-3 pass against this repository's own corpus.

## Summary

This phase ships `plugins/relay/scripts/usage-metrics.mjs`: a dependency-free Node ESM script that regenerates the four TSV relations defined by `${CLAUDE_PLUGIN_ROOT}/resources/usage-metrics-schema.md` by full rescan of the artifacts relay already writes. Output is a pure function of input, so a re-run with an unchanged corpus produces byte-identical files — which is what makes deduplication, append races, and mixed-generation shards structurally impossible rather than merely handled. A `--dry-run` mode prints row counts and destination paths without writing. The phase also corrects two defects grounding found in the Phase 1 contract document: a worked example whose values contradict the real artifact it names, and a `class`-field rule described as historic compatibility when it is in fact the only path two of the three reviewers take today.

## User Story

As a maintainer deciding which part of relay to improve
I want a deterministic script that turns the audit trail already on disk into the four documented relations
So that the measurement corpus becomes durable and portable without any new emission in the pipeline's hot path.

## Problem Statement

The measurement-relevant data relay produces is real but perishable and scattered: `PRPs/plans/*.jsonl` is tracked and survives a clone, while everything under `PRPs/reports/` is gitignored and dies with the machine. Nothing turns either into a form that can be read months later or moved between projects. Phase 1 settled what the columns mean; without a producer, that contract describes a file that does not exist.

## Solution Statement

One shipped script, invoked explicitly by a human — `node <plugin-root>/scripts/usage-metrics.mjs materialize` — that discovers the corpus, parses every source defensively, projects it into the four relations, and rewrites every shard in full. Determinism is achieved by construction rather than by convention: rows are sorted with the default UTF-16 code-unit comparator (never `localeCompare`, whose result is implementation-dependent), line endings are a literal `\n` (never `os.EOL`, which is `\r\n` on the Windows host this repo is developed on), and no timestamp or random value is written into any shard body. Shards are written atomically — temp file then rename — so an interrupted run cannot leave a truncated shard that a later reader consumes as valid data.

## Metadata

| Key | Value |
|-----|-------|
| Type | Executable script (shipped plugin asset) |
| Complexity | High — parses five source shapes, three of which are internally inconsistent on disk |
| Systems Affected | `plugins/relay/scripts/` (new file); `plugins/relay/resources/usage-metrics-schema.md` (two corrections) |
| Dependencies | Phase 1 (the schema contract) |
| Estimated Tasks | 5 |
| Source PRD line ref | `PRPs/prds/usage-metrics.prd.md` Implementation Phases row 2 |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `plugins/relay/resources/usage-metrics-schema.md` | full | The output contract: four relations, every column, the closed field domain, the composite keys, the `undated` shard rule. |
| P0 | `scripts/efficiency.mjs` | 65-100 | The existing consumer of the same corpus: `readdirSync` discovery, suffix→stage mapping, per-line `try/catch`, `timestamp_degraded` handling. The new reader must be reconcilable with it, not a second divergent interpretation. |
| P0 | `plugins/relay/scripts/generate-final-report.mjs` | 30-66 | `readJsonIfExists` — return `null` on a missing file, warn-to-stderr on a parse failure, never throw. Exactly the safe-read shape a full-corpus rescan needs. |
| P1 | `plugins/relay/scripts/normalize-test-output.mjs` | 29-40, 333-336 | The flatter argv-parsing shape, and the `import.meta.url` entry guard that keeps a module import side-effect-free. |
| P1 | `PRPs/reports/plan-review-materiality/orchestrator-run.json` | 10-33 | The real three-shape `phases[]` array this phase must parse — stage/outcome entries, a status/timestamp completion entry, and an implement entry with ad hoc `attempts`/`attempt_1` keys. |
| P1 | `PRPs/reports/usage-metrics/run.json` | 1-23 | One of the two divergent `run.json` shapes: `tdd_mode` as a string, no `phase_context`, phase recoverable only from a record-path substring. |

## Patterns to Mirror

```
# SOURCE: plugins/relay/scripts/generate-final-report.mjs:30-66
  readJsonIfExists returns null on missing/malformed, never throws
```
Task 1 copies this shape for every source read: a corpus rescan touches hundreds of files and must never abort on one bad one.

```
# SOURCE: scripts/efficiency.mjs:65-100
  const suffix = Object.keys(STAGES).find((s) => name.endsWith(s));
  ... try { j = JSON.parse(line); } catch { continue; }
  ... degraded: j.timestamp_degraded === true
```
Task 1 mirrors the suffix→stage derivation and the per-line defensive parse; Task 2 mirrors the degraded handling into the `deg` column.

```
# SOURCE: plugins/relay/scripts/normalize-test-output.mjs:333-336
  if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
```
Task 3 copies this entry guard so the module can be imported by a test without executing `main()`.

```
# SOURCE: PRPs/reports/plan-review-materiality/orchestrator-run.json:10-33
  {"phase":1,"stage":"plan","outcome":"APPROVED"}
  {"phase":1,"status":"complete","timestamp":"2026-08-07T14:15:00Z"}
  {"phase":3,"stage":"implement","attempts":2,"attempt_1":"..."}
```
Task 2 handles all three shapes explicitly; the third has no counterpart on any other stage entry, so `natt` is populated only where a source field genuinely exists.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/scripts/usage-metrics.mjs` | CREATE | The materializer — the phase's primary deliverable. |
| `plugins/relay/resources/usage-metrics-schema.md` | UPDATE | Two corrections grounding proved against the real corpus: a worked example contradicting the artifact it names, and a `class`-rule framing that misdescribes current producer behavior. |

## NOT Building (Scope Limits)

- **The `PRPs/metrics/` directory scaffolding, its `.gitattributes` and `.gitignore`.** Phase 3. This phase writes shards to a path given on the command line or defaulted, and creates parent directories, but ships no git control files.
- **The read/query subcommand.** Phase 3.
- **Any `validate` check or `CONSUMERS` registration.** Phase 4.
- **Any hook, emission point, or consent key.** Phase 5 at the earliest, and a MoSCoW `Won't` for this feature's MVP.
- **Reconciling `bud_prr` / `bud_min` against `run.json`'s separately-named `max_test_retries` / `max_test_minutes`.** Grounding could not resolve which source those columns map to. This phase populates them only from `orchestrator-run.json`'s session-wide `max_plan_review_retries` / `max_orchestrator_minutes` and writes `-` otherwise, recording the open question rather than guessing.

## Step-by-Step Tasks

### Task 1: CREATE plugins/relay/scripts/usage-metrics.mjs — corpus discovery and defensive reads

- **ACTION**: Create the script with `// @ts-check`, `node:`-prefixed synchronous builtin imports, and no npm dependency. Implement corpus discovery and reading only: `readJsonIfExists(path)` returning `null` on a missing file and warning to stderr without throwing on a malformed one; `readJsonlLines(path)` returning `{records, errors}` where each line is parsed in its own `try/catch`, blank lines are skipped, a missing trailing newline is tolerated, and a malformed line is recorded with its 1-based line number rather than aborting the file; and `discoverCorpus(root)` which `readdirSync`s `PRPs/plans` and `PRPs/plans/completed`, maps each filename suffix to a stage via a `STAGES` map keyed `.review.jsonl` → `plan-review`, `.code-review.jsonl` → `code-review`, `.test-write-review.jsonl` → `test-write-review`, and walks `PRPs/reports/*/` for `orchestrator-run.json` and `run.json`. Delivers AC-A1.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/generate-final-report.mjs:30-66` and `# SOURCE: scripts/efficiency.mjs:65-100`.
- **VALIDATE**:
  ```bash
  set -euo pipefail
  F=plugins/relay/scripts/usage-metrics.mjs
  test -f "$F" || { echo "FAIL: $F absent"; exit 1; }
  node --check "$F" || { echo "FAIL: $F is not syntactically valid"; exit 1; }
  grep -q "from 'node:fs'" "$F" || { echo "FAIL: expected node:-prefixed builtin imports"; exit 1; }
  if grep -qE "require\(|from '[^n]" "$F"; then echo "FAIL: non-builtin or CJS import found"; exit 1; fi
  echo "PASS: script parses and imports only node builtins"
  ```

### Task 2: UPDATE plugins/relay/scripts/usage-metrics.mjs — relation projection

- **ACTION**: Add the four projection functions. `projectVerdicts` emits one row per jsonl line with `seq` as the 1-based line index, `deg` from `timestamp_degraded === true`, and the `nrub`/`nfail`/`nblk`/`nadv`/`nesc` tallies computed with the absent-`class`-reads-as-blocking rule. `projectRubric` emits one row per rubric row, denormalizing `proj`, `ts`, `deg` and `stage` from the parent. `projectRuns` handles all three `orchestrator-run.json` `phases[]` shapes explicitly: a `stage`/`outcome` entry becomes a row with `ts` set to `-`; a `status`/`timestamp` completion entry becomes a row with `stage` set to `complete` and its `status` carried in `outcome`; an entry carrying ad hoc `attempts` populates `natt`, and every other entry writes `-` there. `projectScan` emits the single scan row, reading the plugin version from the installed manifest and writing `-` when it cannot be read. Every projected value is validated against the closed field contract before emission: a value that is not a code, a non-negative integer, or an ISO-8601 instant is written as `-`, and any value containing a tab, CR, or newline is rejected the same way. Delivers AC-A2 and AC-A3.
- **MIRROR**: `# SOURCE: PRPs/reports/plan-review-materiality/orchestrator-run.json:10-33` and `# SOURCE: scripts/efficiency.mjs:65-100`.
- **VALIDATE**:
  ```bash
  set -euo pipefail
  F=plugins/relay/scripts/usage-metrics.mjs
  for FN in projectVerdicts projectRubric projectRuns projectScan; do
    grep -q "function $FN" "$F" || { echo "FAIL: missing $FN"; exit 1; }
  done
  grep -q "'complete'" "$F" || { echo "FAIL: completion-record shape not handled"; exit 1; }
  echo "PASS: four projections present and the completion shape is handled"
  ```

### Task 3: UPDATE plugins/relay/scripts/usage-metrics.mjs — deterministic writer, CLI, dry-run

- **ACTION**: Add the writer and CLI. Rows are sorted by their relation's composite key using the default comparator over a joined key string — never `localeCompare`, whose result is documented as implementation-dependent and therefore unsafe for byte-identical output. Every shard is written with a literal `'\n'` separator and a trailing newline, never `os.EOL`, because `os.EOL` is `\r\n` on the Windows host this repo is developed on and would make the same corpus produce different bytes per platform. Writes are atomic: write to `<path>.tmp` then `renameSync` over the target. Shard destinations follow the schema's grammar, with rows whose `ts` is `-` or unparseable routed to the `-undated` shard. Add a CLI accepting `materialize` and `--dry-run`, where `--dry-run` prints one line per destination shard with its row count and writes nothing at all. Guard `main()` behind an `import.meta.url` check so the module can be imported by a test without executing. Delivers AC-A4.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/normalize-test-output.mjs:333-336`.
- **VALIDATE**:
  ```bash
  set -euo pipefail
  F=plugins/relay/scripts/usage-metrics.mjs
  # Match the CALL / IMPORT, not the word: both tokens appear in comments that
  # explain why they are not used, and a bare-word grep flags those legitimate
  # quoted prohibitions — the same false-positive shape the plan template
  # documents for `.claude/PRPs` greps.
  if grep -q '\.localeCompare(' "$F"; then echo "FAIL: localeCompare is implementation-dependent and breaks byte-identical output"; exit 1; fi
  if grep -qE "from 'node:os'|require\('os'\)" "$F"; then echo "FAIL: os.EOL is CRLF on Windows and breaks cross-platform byte-identity"; exit 1; fi
  grep -q "import.meta.url" "$F" || { echo "FAIL: missing entry guard"; exit 1; }
  grep -q "renameSync" "$F" || { echo "FAIL: writes are not atomic"; exit 1; }
  echo "PASS: determinism and atomicity guards present"
  ```

### Task 4: UPDATE plugins/relay/resources/usage-metrics-schema.md — correct two proven defects

- **ACTION**: Fix two defects grounding proved against the real corpus. First, the `verdict` and `rubric` worked examples name the real artifact `usage-metrics-phase-1-codebook-field-contract` but carry values that contradict its actual content (the example shows `seq=2`, `CHANGES_REQUESTED`, `nfail=2`; the real file holds exactly one line, `seq=1`, `APPROVED`, `nfail=0`). Replace the artifact name in both examples with the clearly illustrative `example-feature-phase-1-example-slug` so no reader mistakes a hand-written example for a fixture drawn from the corpus. Second, the `cls` column's description calls an absent `class` field "the pre-taxonomy compatibility rule", which misdescribes current behavior: across 2184 rubric rows in every `.code-review.jsonl` and `.test-write-review.jsonl` on disk, including entries written after the materiality taxonomy shipped, exactly zero carry a `class` field. Restate it as a reading caveat: `class` is emitted by `plan-reviewer` only, so `cls` reads `blocking` for every code-review and test-write-review row, and a per-class comparison ACROSS stages measures which producer emits the field rather than any property of the pipeline. Delivers AC-A5.
- **MIRROR**: `# SOURCE: scripts/efficiency.mjs:65-100` — the same absent-class-reads-as-blocking rule, whose consequence this correction makes explicit.
- **VALIDATE**:
  ```bash
  set -euo pipefail
  F=plugins/relay/resources/usage-metrics-schema.md
  if grep -q 'usage-metrics-phase-1-codebook-field-contract' "$F"; then echo "FAIL: worked example still names a real artifact with contradicting values"; exit 1; fi
  grep -q 'example-feature-phase-1-example-slug' "$F" || { echo "FAIL: illustrative example name not adopted"; exit 1; }
  grep -q 'measures which producer emits the field' "$F" || { echo "FAIL: cross-stage class caveat not stated"; exit 1; }
  echo "PASS: both codebook defects corrected"
  ```

### Task 5: Run the materializer against this repository's own corpus

- **ACTION**: Execute `node plugins/relay/scripts/usage-metrics.mjs materialize` against this repository, then execute it a second time with no intervening change, and confirm the second run produces byte-identical output by comparing a hash of every generated shard. Then run `--dry-run` and confirm it writes nothing while reporting non-zero row counts. This is the backfill: the 206 tracked jsonl files are the corpus, and their projection is the "before" period the feature exists to make available on day one. Record the resulting row counts in `## Notes`. This task delivers no new acceptance criterion of its own — it is the execution that exercises AC-A4 against real data rather than fixtures.
- **MIRROR**: `# SOURCE: scripts/efficiency.mjs:65-100` — the same corpus, read the same way.
- **VALIDATE**:
  ```bash
  set -euo pipefail
  node plugins/relay/scripts/usage-metrics.mjs materialize || { echo "FAIL: materialize errored"; exit 1; }
  H1=$(find PRPs/metrics -name '*.tsv' -type f | sort | xargs sha256sum | sha256sum)
  node plugins/relay/scripts/usage-metrics.mjs materialize || { echo "FAIL: second materialize errored"; exit 1; }
  H2=$(find PRPs/metrics -name '*.tsv' -type f | sort | xargs sha256sum | sha256sum)
  test "$H1" = "$H2" || { echo "FAIL: regeneration is not byte-identical"; exit 1; }
  echo "PASS: byte-identical regeneration confirmed"
  ```

## Validation Commands

**Level 1 STATIC_ANALYSIS**

```bash
set -euo pipefail
F=plugins/relay/scripts/usage-metrics.mjs
node --check "$F" || { echo "FAIL: syntax error in $F"; exit 1; }
if grep -qE "^\s*(const|let|var).*=\s*require\(" "$F"; then
  echo "FAIL: CommonJS require() in an ESM module"; exit 1
fi
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
# Dry-run must write nothing.
BEFORE=$(find PRPs/metrics -type f 2>/dev/null | sort | sha256sum || echo "none")
node plugins/relay/scripts/usage-metrics.mjs --dry-run > /dev/null \
  || { echo "FAIL: --dry-run errored"; exit 1; }
AFTER=$(find PRPs/metrics -type f 2>/dev/null | sort | sha256sum || echo "none")
test "$BEFORE" = "$AFTER" || { echo "FAIL: --dry-run mutated the tree"; exit 1; }
# The repo's own suite must stay green.
npm run validate || { echo "FAIL: npm run validate is red"; exit 1; }
node --test "scripts/validate/checks/*.test.mjs" \
  || { echo "FAIL: full corpus regression"; exit 1; }
echo "PASS: integration green"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-8):** Given a corpus containing a malformed jsonl line and a missing report file, when the materializer runs, then it completes without throwing, records the malformed line's 1-based number in its stderr diagnostics, and emits every well-formed row.
- **AC-A2 (PRD AC-3):** Given an `orchestrator-run.json` whose `phases[]` array holds a stage entry, a status-keyed completion entry, and an entry carrying ad hoc `attempts` keys, when the run relation is projected, then all three are emitted as rows keyed `(proj, feat, phase, stage)` with no row minted twice and `natt` populated only where a source field exists.
- **AC-A3 (PRD AC-7):** Given any projected value, when a shard is written, then every cell is a code, a non-negative integer, an ISO-8601 UTC instant, or `-`, and no cell contains a tab, CR, or newline.
- **AC-A4 (PRD AC-1):** Given an unchanged corpus, when the materializer runs twice, then every generated shard is byte-identical between runs, and `--dry-run` writes nothing while reporting non-zero row counts.
- **AC-A5 (PRD AC-4):** Given the corrected codebook, when a reader looks up the `cls` column, then it states that `class` is emitted by `plan-reviewer` only and that a cross-stage class comparison measures producer behavior rather than a property of the pipeline.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| `run.json`'s phase identity has no uniform source — `phase_context` in one real sample, absent in another where it is recoverable only from a record-path substring | H | M | Prefer `phase_context`; fall back to a record-path match; write `-` when neither yields a value, rather than inventing one |
| `natt` has no uniform source across producers (ad hoc `attempts` keys versus an `attempts[]` array) | H | L | Populate only where a source field genuinely exists; `-` otherwise, documented in the codebook |
| `bud_prr` / `bud_min` mapping unresolved between two differently-named budget field sets | M | L | Populate from `orchestrator-run.json` only; recorded in `## NOT Building` and left as an open question rather than guessed |
| Sorting or line endings differ per platform, silently breaking byte-identity | M | H | Default comparator only (never `localeCompare`), literal `\n` (never `os.EOL`); both enforced by a Task 3 VALIDATE grep that fails on either token |
| An interrupted run leaves a truncated shard a later reader consumes as valid | L | H | Atomic write: temp file then `renameSync` |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- Validation blocks use explicit `|| { echo "FAIL: …"; exit 1; }` guards rather than relying on `set -e` alone, for the reason established and empirically verified in Phase 1's plan: `( set -e; false; echo REACHED )` prints `REACHED` and exits 0 in this repository's shell, so a block ending in an `echo` would always exit 0.
- Two Task 3 VALIDATE greps are deliberately *prohibitive* — they fail when `localeCompare` or `os.EOL` appears. Both tokens are the documented failure mode for byte-identical cross-platform output, and a prohibition grep is the only way a static check can catch them before a second platform is ever involved.
- Task 4's corrections are Phase 1 defects surfaced by this phase's grounding. They are folded in here rather than left standing because Phase 2 implements against that contract, and Phase 1's own stated goal was to settle every field before any byte is written into a repository.

*Generated: 2026-08-13*
*Approved: 2026-08-13*
*Status: IMPLEMENTED*
