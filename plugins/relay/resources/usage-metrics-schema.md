# Usage Metrics Schema

Canonical codebook for the per-project usage-metrics artifact relay
materializes into a target project's `PRPs/metrics/` directory.

**Producer:** `plugins/relay/scripts/usage-metrics.mjs` (the materializer),
which regenerates every shard by full rescan of the artifacts relay already
writes. **Consumer:** a human, an AI, or a script deciding which part of relay
to improve next.

Source of truth for the field set: `PRPs/prds/usage-metrics.prd.md`.

---

## Purpose and consumer contract

The data files are deliberately terse. A cell holds a bare code, a
non-negative integer, an ISO-8601 UTC instant, or a single `-` sentinel —
never a label, never a sentence, never a path. All meaning lives in this
document.

That trade is only sound because of who reads the data: a consumer that
already holds the relay repository. This mirrors OpenTelemetry's `schema_url`
model, where telemetry carries only a version pointer and the attribute
definitions live in an externally published, immutable schema file. Here the
pointer is the schema version in each shard's filename, and this file is the
published definition.

Two consequences follow, and both are contractual:

1. **A reader must resolve codes against this document and, for open sets,
   against the producing agent files.** A code this document does not list is
   not necessarily corrupt data — see `## Enum domains`.
2. **A writer must never widen the value space to make a row more
   self-explanatory.** Adding a prose column would defeat the format, inflate
   every downstream read, and reintroduce the leak surface the closed contract
   exists to eliminate.

## File layout and naming

Shards live at `PRPs/metrics/` in the target project, one file per relation
per calendar month:

```
PRPs/metrics/verdict-v1-2026-08.tsv
PRPs/metrics/verdict-v1-undated.tsv
PRPs/metrics/rubric-v1-2026-08.tsv
PRPs/metrics/run-v1-2026-08.tsv
PRPs/metrics/scan-v1.tsv
```

Grammar: `<relation>-v<MAJOR>-<YYYY-MM>.tsv`, plus one
`<relation>-v<MAJOR>-undated.tsv` per relation. The `scan` relation is not
month-sharded — it is small by construction (one row per materialization) and
is the file a reader opens first.

**The `undated` shard is mandatory, not a fallback.** Some source rows carry
no usable timestamp: `orchestrator-run.json`'s per-stage entries have no
`timestamp` field at all, only the terminal completion record does. Those rows
go to the `undated` shard rather than being stamped with a fabricated time.
The idiom is borrowed from `scripts/efficiency.mjs`, which already partitions
an `undated` set rather than guessing.

**The schema version lives in the filename, never in a per-row column.** Two
reasons. Concatenating `cat verdict-v1-*.tsv` is then provably homogeneous —
every row in every matched file is the same generation. And a version bump
starts a new filename series, so it is physically incapable of contaminating
or rewriting existing data.

Files are LF-terminated. The first line of every shard is a header row naming
the columns; every subsequent line is one record.

## Versioning

Adapted from `${CLAUDE_PLUGIN_ROOT}/resources/test-output-schema.md`, whose
rule is that version is normally implied by field presence and an explicit
version marker is reserved for breaking changes.

- **Additive change — no version bump.** A new column is appended at the END
  of the row. Readers that do not know the column ignore it; readers that do
  find it absent on older rows and treat that as "not recorded", never as
  zero. The header row is what tells a reader which columns a given shard
  actually carries.
- **Breaking change — new `v<MAJOR>` filename series.** Removing a column,
  retyping one, or changing the meaning of an existing code starts
  `<relation>-v2-*.tsv`. Existing `v1` shards are never rewritten, never
  migrated, and never deleted by the materializer.
- **Mixed generations are expected and safe.** A project that upgrades relay
  mid-month ends with `v1` and `v2` shards side by side. A reader processes
  each series on its own terms; there is no in-place migration step to get
  wrong.

**Worked example of an additive change.** On 2026-08-14 the `run` relation
gained `ms`, `suite_ms` and `corr_ms`, appended at the end of the row. No
version bump, no rewrite of existing shards: shards written before that date
carry ten columns, shards written after carry thirteen, and each shard's own
header row is what tells a reader which it has. That is the rule above working
as intended rather than an exception to it.

**Scope of the byte-identity guarantee.** The three fact relations —
`verdict`, `rubric`, `run` — are regenerated in full on every materialization
and are byte-identical when the corpus has not changed. The `scan` relation is
deliberately different: it is a HISTORY, one row per materialization, so it
grows by exactly one row per run and its prior rows are immutable. A reader
verifying determinism must compare the fact tables; comparing `scan` across two
runs at different instants is expected to differ, and a `scan` file that did
NOT grow would mean the collector did not run.

This document is versioned with the artifact: the `v<MAJOR>` in a shard's
filename refers to the relation definitions below as they stood when that
shard was written.

## Relation: verdict

One row per reviewer verdict line — that is, one row per non-empty line of a
`PRPs/plans/<basename>.review.jsonl`, `.code-review.jsonl`, or
`.test-write-review.jsonl` file.

```
proj	ts	deg	stage	art	seq	feat	phase	verdict	action	nrub	nfail	nblk	nadv	nesc
relay	2026-08-07T21:14:03Z	0	plan-review	example-feature-phase-1-example-slug	2	usage-metrics	1	CHANGES_REQUESTED	rubric_fail	19	2	1	1	0
```

### Field semantics

| Column | Domain | Meaning | Contractual |
|--------|--------|---------|-------------|
| `proj` | code | Stable, human-readable project id. Basename of the project root, resolved once and persisted. Never a path hash, never the git remote. | yes |
| `ts` | ISO-8601 UTC instant | The verdict's own `timestamp`, written through verbatim from the source line. Rows whose source has no usable instant go to the `undated` shard. | yes |
| `deg` | `0` \| `1` | `1` when the source line carried `timestamp_degraded: true`. See `## Field contract` for the read-time rule. | yes |
| `stage` | code | Pipeline stage, derived from the source filename suffix: `plan-review`, `code-review`, `test-write-review`. | yes |
| `art` | code | Artifact basename the verdict belongs to, without suffixes. | yes |
| `seq` | non-negative integer | 1-based position of this verdict within its artifact's log. Together with `art` it is the row's identity. | yes |
| `feat` | code \| `-` | Feature slug, when derivable from the artifact name. | no |
| `phase` | non-negative integer \| `-` | Source PRD phase number, when derivable. | no |
| `verdict` | code | See `## Enum domains`. | yes |
| `action` | code | See `## Enum domains`. | yes |
| `nrub` | non-negative integer | Total rubric rows recorded on this verdict. | yes |
| `nfail` | non-negative integer | Rows with `passed: false`. | yes |
| `nblk` | non-negative integer | Failing rows classed `blocking`. A row with no `class` field counts as blocking. | yes |
| `nadv` | non-negative integer | Failing rows classed `advisory`. | yes |
| `nesc` | non-negative integer | Failing rows carrying `escalated: true`. | no |

## Relation: rubric

One row per rubric row within a verdict. `proj`, `ts` and `stage` are
denormalized from the parent verdict so the most-asked question — which check
ids fail most often, per stage — needs no join.

```
proj	ts	deg	stage	art	seq	rid	pass	cls	esc	rat
relay	2026-08-07T21:14:03Z	0	plan-review	example-feature-phase-1-example-slug	2	R-COH-VALIDATE-ALWAYS-PASS	0	blocking	0	-
```

### Field semantics

| Column | Domain | Meaning | Contractual |
|--------|--------|---------|-------------|
| `proj` | code | Denormalized from the parent verdict. | yes |
| `ts` | ISO-8601 UTC instant | Denormalized from the parent verdict. | yes |
| `deg` | `0` \| `1` | Denormalized from the parent verdict. Required here, not merely convenient: a reader computing a per-`rid` failure rate must exclude degraded rows without joining back to `verdict`, which is the join this relation's denormalization exists to avoid. | yes |
| `stage` | code | Denormalized from the parent verdict. Required: a rubric id alone does not identify its stage — `R-COH-OTHER-INTERNAL-CONTRADICTION` is emitted by both plan-review and code-review. | yes |
| `art` | code | Parent verdict's artifact. | yes |
| `seq` | non-negative integer | Parent verdict's sequence number. | yes |
| `rid` | code | The rubric check id, verbatim. Open set — see `## Enum domains`. | yes |
| `pass` | `0` \| `1` | `1` when the row recorded `passed: true`. A row recorded as `null` (a documented degraded outcome) is emitted with `pass` set to `-`. | yes |
| `cls` | `blocking` \| `advisory` | Materiality class. An absent `class` field on the source row is written as `blocking`. **Read this column per stage, never across stages** — see the caveat below. | yes |
| `esc` | `0` \| `1` | `1` when the row carried `escalated: true`. | no |
| `rat` | code \| `-` | The row's `ratchet` annotation when present, e.g. `out-of-scope-new-finding`. | no |

**`cls` is only comparable within a stage.** The `class` field is emitted by
`plan-reviewer` alone. Measured against this repository's own corpus at the
time of writing: across 2184 rubric rows in every `.code-review.jsonl` and
`.test-write-review.jsonl` on disk — including entries written after the
materiality taxonomy shipped — exactly zero carry a `class` field. So `cls`
reads `blocking` for every code-review and test-write-review row, always, and
that is a property of the producer rather than of the finding. A cross-stage
comparison of advisory rate therefore measures which reviewer emits the field,
not how materially the stages differ; it will report those two stages as
having never produced an advisory finding, which is an artifact, not a result.
Compare within `plan-review` only, until the other two reviewers emit the
field.

**Passing rows are retained, not only failures.** Without them, two questions
are unanswerable: which checks never fire (and are therefore candidates for
pruning), and what the rubric composition was at a given plugin version. The
existing corpus already interleaves two plan-review generations — `R1`–`R8`
alongside seventeen `R-COH-*` ids — so composition is not reconstructible from
any other source.

## Relation: run

One row per `(feat, phase, stage)` observed in a feature's
`PRPs/reports/<feature>/orchestrator-run.json` and `run.json`.

```
proj	ts	feat	phase	stage	outcome	halt	bud_prr	bud_min	natt
relay	-	usage-metrics	1	plan	APPROVED	-	2	240	1
```

### Field semantics

| Column | Domain | Meaning | Contractual |
|--------|--------|---------|-------------|
| `proj` | code | Project id. | yes |
| `ts` | ISO-8601 UTC instant \| `-` | The stage entry's own instant when it carries one. Most stage entries do not — see the reading rule below. | yes |
| `feat` | code | Feature slug. | yes |
| `phase` | non-negative integer | Source PRD phase number. | yes |
| `stage` | code | See `## Enum domains`. | yes |
| `outcome` | code | The stage's recorded outcome. | yes |
| `halt` | code \| `-` | The HALT code when the outcome was a halt; `-` otherwise. See `## Enum domains` for the producer-drift caveat. | yes |
| `bud_prr` | non-negative integer \| `-` | `max_plan_review_retries` in force for the run. | no |
| `bud_min` | non-negative integer \| `-` | `max_orchestrator_minutes` in force for the run. | no |
| `natt` | non-negative integer \| `-` | Attempts recorded for the stage, when the source carries them. | no |
| `ms` | non-negative integer \| `-` | Wall-clock milliseconds for the stage, from `run.json`'s `elapsed_ms`. Absent on stage entries from `orchestrator-run.json`, which records no per-stage duration — and deliberately NOT derived from consecutive completion timestamps, which would be inference presented as measurement. | no |
| `suite_ms` | non-negative integer \| `-` | Milliseconds spent executing the test suite, summed across attempts from `run.json`'s `time_breakdown`. | no |
| `corr_ms` | non-negative integer \| `-` | Milliseconds spent in auto-correction between attempts, summed the same way. Together with `suite_ms` this separates "the suite is slow" from "the loop kept correcting". | no |

**Duration is recorded where it exists and absent elsewhere — never zero.**
Two of the four real `run.json` files on disk at the time of writing carry no
timing fields at all. Those rows get `-`, not `0`: a zero would read as "ran
instantly" and would silently drag any average toward it. This is also why
these three columns are marked non-contractual — a consumer must handle their
absence, and a phase that predates them is not defective for lacking them.

**Reading rule — two record shapes in one source.** `orchestrator-run.json`'s
`phases[]` array holds per-stage entries keyed `stage` and `outcome`, but the
per-phase completion record in the same array is keyed `status` instead, and
is the only entry carrying a `timestamp`. This is a real inconsistency in the
producer, recorded here rather than normalized away: a materializer that
assumed one shape would silently drop the other. A completion record is
emitted as a row with `stage` set to `complete` and its `status` value carried
in `outcome`.

**Never content-hash this source.** See `## Field contract`.

## Relation: scan

One row per materialization. This is the relation a reader opens first.

```
proj	ts	pv	tool_v	nsrc	nverdict	nrubric	nrun	ndeg
relay	2026-08-13T21:34:03Z	0.31.0	1	206	368	4472	87	3
```

### Field semantics

| Column | Domain | Meaning | Contractual |
|--------|--------|---------|-------------|
| `proj` | code | Project id. | yes |
| `ts` | ISO-8601 UTC instant | When the materializer ran. | yes |
| `pv` | code \| `-` | The relay plugin version observed at materialization time, read from the installed plugin manifest. `-` when it could not be read. | yes |
| `tool_v` | non-negative integer | Materializer schema generation, matching the `v<MAJOR>` of the shards it wrote. | yes |
| `nsrc` | non-negative integer | Source files scanned. | yes |
| `nverdict` | non-negative integer | Rows written to the verdict relation. | yes |
| `nrubric` | non-negative integer | Rows written to the rubric relation. | yes |
| `nrun` | non-negative integer | Rows written to the run relation. | yes |
| `ndeg` | non-negative integer | Rows carrying `deg` set to `1`. | yes |

**The version axis is bounded, not stamped.** No relay artifact records the
plugin version anywhere — the fact is destroyed at write time, not merely
omitted at read time, so a derivation-only materializer cannot recover it per
row. The `scan` relation supplies the axis instead: rows written between two
scans lie between those scans' `pv` values. This is an approximation and is
documented as one. Slicing a corpus at a release date instead would be worse,
because projects upgrade on different days.

**Liveness.** `scan` is also how a reader distinguishes "the collector stopped
running" from "nobody ran relay". An absence of verdict rows with a recent
scan row means genuine idleness; an absence of both means the instrument may
be broken. Without this relation the two are indistinguishable, and that
ambiguity lands hardest exactly at version boundaries.

## Field contract

**Every value in every relation is one of exactly four things:** a code drawn
from a domain named in `## Enum domains`, a non-negative integer, an ISO-8601
UTC instant of the form `YYYY-MM-DDTHH:MM:SSZ`, or the single `-` sentinel.

- **`-` is the only sentinel.** It means "not applicable or not recorded for
  this row". There is no separate encoding for null versus missing versus
  not-applicable; the distinction has never been needed for these relations
  and inventing three codes would invite inconsistent use. Statistical
  codebook practice collapses the same way.
- **No free-text column exists in any relation.** Not a `reason`, not a
  message, not a file path, not a diff. This is the privacy mechanism: with
  nowhere for prose to land, there is nothing for a secret to land in either,
  so the redaction layers have no work to do by construction rather than by
  filtering. It is also the size mechanism — prose and long paths, not codes,
  dominate the byte size of the source corpus.
- **No value may contain a tab, a CR, or a newline.** This is what makes
  unquoted TSV safe to parse with `cut`, `awk`, or a two-line reader. A
  producer that cannot satisfy it for some value must write `-`, never an
  escaped form.

**Row identity — natural composite keys.** Each relation has a key, and the
materializer regenerates rather than appends, so a re-run converges to
identical bytes rather than duplicating rows:

| Relation | Key |
|----------|-----|
| `verdict` | `(proj, stage, art, seq)` |
| `rubric` | `(proj, stage, art, seq, rid)` |
| `run` | `(proj, feat, phase, stage)` |
| `scan` | `(proj, ts)` |

**Content-hashing a progressively-written source is forbidden.**
`orchestrator-run.json` is appended to as each stage completes, then written
back after the fact — `ended_at` and `outcome` at run end, and `merged_at`
plus the approve outcome post-merge. A content-addressed row id over that file
changes on every mutation, so a "skip ids already present" dedup cannot
recognize an update and appends a second row instead, amplifying one run into
many. The composite key above updates in place instead. Content addressing is
permitted only over append-only immutable sources.

**Degraded rows are recorded, excluded at read time, and never rewritten.** A
source line carrying `timestamp_degraded: true` is emitted with `deg` set to
`1`. A reader computing any rate excludes those rows from both sides of a
comparison and reports the excluded count as a named warning. The source line
is never edited to repair it: historic degradation stays visible in the corpus
rather than being silently healed.

## Enum domains

Some domains are closed — a value outside the list is a defect. Others are
open — new values appear over time and a reader must tolerate them. Producers
validate against the closed set; consumers parse with the open one.

**Closed domains.**

| Column | Values |
|--------|--------|
| `verdict` | `APPROVED`, `CHANGES_REQUESTED`, `RUBRIC_PASSED`, and the arbitration values `DISPUTE_REJECTED`, `DISPUTE_UPHELD_TEST_WRONG`, `DISPUTE_UPHELD_NEW_COVERAGE`, `DISPUTE_UPHELD_PRD_AMBIGUOUS` |
| `action` | `final_flip`, `rubric_fail`, `revalidation_fail`, `rubric_evaluation`, `rubric_pass_delegated`, `human_authorized_ac_amendment` |
| `cls` | `blocking`, `advisory` |
| `deg`, `pass`, `esc` | `0`, `1` (and `-` for `pass` only) |
| `stage` (verdict, rubric) | `plan-review`, `code-review`, `test-write-review` |

**Open domains.**

| Column | Resolution authority |
|--------|----------------------|
| `rid` | The reviewer agent files under `plugins/relay/agents/` — `plan-reviewer.md`, `code-reviewer.md`, `code-reviewer-semantic.md`, `test-reviewer.md`. Each reviewer's core set is small and fixed, but the `R-COH-*` coherence layer grows by recorded decision: plan-review's own rubric went from 8 to 27 ids. **A reader encountering an unknown `rid` must treat it as a check added after the shard was written, never as corrupt data.** |
| `stage` (run) | `plugins/relay/commands/relay-execute.md`. Observed values include `plan`, `worktree`, `tdd`, `implement`, `test_after`, `test`, `test_review`, `visual_approval`, `row_status_flip`, and `complete`. New pipeline stages add new values. |
| `outcome`, `halt` | The command files under `plugins/relay/commands/`. Each command owns its own vocabulary. |

**Producer drift is real and is not normalized here.** The oscillation halt is
written as `FAILED_OSCILLATION` by `relay-test.md` and as
`FAILED_OSCILLATION_DETECTED` by `relay-implement.md` and `relay-execute.md`.
These are two distinct literals in the corpus. A reader treating them as one
value must map them deliberately; the materializer records what the producer
wrote.

## What is NOT in the schema

Stated explicitly, in the posture
`${CLAUDE_PLUGIN_ROOT}/resources/redaction-policy.md` uses — including what is
deliberately not excluded.

- **No prose, reason strings, or review messages.** They dominate the byte
  size of the source corpus and are the only place a secret could plausibly
  land. Their absence is what makes the closed field contract a privacy
  mechanism rather than a filter.
- **No file paths.** Not plan paths, not diff paths, not source file names.
- **No diff or code content of any kind.**
- **No token counts, cost figures, or model identifiers.** The only local
  ground truth for these is the Claude Code session transcript store, and no
  join key exists between a session and a relay feature or phase. Attribution
  by time ordering would produce a number that gets quoted and is wrong.
- **No per-row plugin-version stamp.** That would require emission in the hot
  path, which the zero-token collection constraint forbids. The `scan`
  relation bounds the axis instead.
- **No personal identity of any kind** — no author, no committer, no machine
  id, no user id. These relations describe pipeline behavior, not people, and
  measuring individuals with them is out of scope by construction.

**Deliberately not excluded, and named rather than glossed over:** feature and
artifact slugs remain in `feat` and `art`, and they are project-identifying.
They are the join key that makes per-project analysis possible, so removing
them would defeat the artifact. They are therefore **documented-not-redacted**
— the same posture redaction-policy's own Layer 3 takes toward values that are
informative but not secret. A shard leaving its origin organization should be
reviewed on that basis rather than assumed anonymous.
