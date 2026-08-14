# Feature: Codebook + field contract (Phase 1 of usage-metrics)

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting artifact creation (a plugin-packaged resource every downstream phase and every future consumer reads); establishes a data contract consumed outside the pipeline
- Decisions found:
  - [2026-08-13] Per-project plugin-usage metrics artifacts — registration entry; its seven decision points bind this phase, and points 1 (schema + versioning) and 7 (field integrity) are what this phase answers
  - [2026-04-19] PRP artifacts live under `PRPs/`, never under `.claude/`
  - [2026-08-06] Materiality classes: every plan-review rubric row carries `class: blocking | advisory`; an absent `class` field reads as blocking
  - [2026-07-31] A degraded timestamp excludes its artifact from both sides — never rewrite history
  - [2026-08-05] Rework is counted per review session, not per jsonl file
- Applicable anti-patterns:
  - Writing pipeline artifacts under `.claude/` (`docs/anti-patterns.md`)
  - Emitting secret values in run reports or logs (`docs/anti-patterns.md`) — the closed field contract this phase defines is the structural answer
  - Injecting plugin defaults into the target project's `decisions.md`
- Applicable architectural rules:
  - Plugin-owned resources live at `plugins/relay/resources/` and are cited only as `${CLAUDE_PLUGIN_ROOT}/resources/<file>.md` (`docs/context/conventions.md`)
  - Interactivity boundary: this phase runs autonomously, no user dialogue
  - `PRPs/` artifact-path convention
- Result: PROCEED
```

## Source

- `PRPs/prds/usage-metrics.prd.md` — Implementation Phases row 1: "Codebook + field contract" — Goal: settle every field before a single byte is written into anyone's repository — Success signal: a reviewer can state, for each column, its domain and the plugin-improvement decision it informs.

## Summary

This phase writes exactly one new file — `plugins/relay/resources/usage-metrics-schema.md` — the codebook that gives meaning to every value in the usage-metrics artifact. Because the consumer is a human, an AI, or a script that already holds the relay repository, the data files themselves stay terse (bare codes, integers, ISO instants, one `-` sentinel) and this document carries all the semantics, mirroring OpenTelemetry's `schema_url` model. The codebook documents four relations (`verdict`, `rubric`, `run`, `scan`), every column's closed domain, the natural composite keys that make full regeneration idempotent, which enum sets are closed versus open, and the version-axis approximation the `scan` relation provides. No executable code ships in this phase — the materializer that produces these files is Phase 2.

## User Story

As a maintainer deciding which part of relay to improve
I want a versioned codebook that defines every column of the usage-metrics artifact
So that any interpreter — human, AI, or script — can read the terse data files correctly months later, across plugin versions, without guessing.

## Problem Statement

relay writes a rich per-run audit trail into every project that uses it, but nothing in that trail is designed to be read later, and half of it does not survive a clone. Before any byte of a metrics artifact is written into someone else's repository, the field set must be settled: an artifact whose columns are ambiguous, whose sentinel is undefined, or whose enum domains are undocumented is worse than no artifact, because it invites confident misreading. This phase is deliberately documentation-only so the entire field contract can be argued and corrected before it becomes data on disk — the one part of the design that cannot be walked back.

## Solution Statement

Author a single plugin-packaged resource file that mirrors the structure of its closest sibling, `test-output-schema.md` (schema example → field semantics table → exclusions → versioning), extended to four relations. The document fixes: a closed field contract (every value is an enumerated code, a non-negative integer, an ISO-8601 UTC instant, or the `-` sentinel — no free-text column exists anywhere); a `proj` column on every relation so concatenated cross-project shards stay attributable; a `deg` column plus the read-time exclusion rule inherited from the 2026-07-31 degraded-timestamp precedent; natural composite keys per relation, with content-hashing of progressively-written sources explicitly forbidden; schema version carried in the filename rather than in a per-row column; and an explicit statement of which enum domains are closed (verdicts, actions, HALT codes, stages) versus open (rubric check ids, resolved against the reviewer agent files rather than frozen here).

## Metadata

| Key | Value |
|-----|-------|
| Type | Documentation / data contract |
| Complexity | Medium — one file, but its field set binds every later phase |
| Systems Affected | `plugins/relay/resources/` (new file only) |
| Dependencies | None (row 1 has an empty `Depends` cell) |
| Estimated Tasks | 4 |
| Source PRD line ref | `PRPs/prds/usage-metrics.prd.md` Implementation Phases row 1 |
| phase_type | docs |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `plugins/relay/resources/test-output-schema.md` | 24-114 | The closest sibling resource and the structure to mirror: schema example, `### Field semantics` table, `### What is NOT in the schema`, `## Versioning`. |
| P0 | `plugins/relay/resources/test-output-schema.md` | 99-114 | The repo's only existing schema-versioning precedent — field-presence-implied versioning, `schema_version` reserved for breaking changes, three evolution rules. |
| P0 | `PRPs/prds/usage-metrics.prd.md` | 1-130 | The source PRD: the seven decision points this codebook answers, the closed-field-contract requirement (AC-7), and the `scan`-relation version-axis rationale. |
| P1 | `plugins/relay/agents/code-reviewer.md` | 764-775 | The literal `verdict` / `action` enum values a codebook must enumerate verbatim rather than paraphrase. |
| P1 | `plugins/relay/agents/plan-reviewer.md` | 1111-1137 | The K=5 per-finding id taxonomy — evidence that rubric ids are a growing, agent-owned set, which is why the codebook points at the reviewer files as the id-resolution authority. |
| P1 | `plugins/relay/resources/redaction-policy.md` | 14-111 | The `## Layer N — <name>` sectioning idiom for a policy-style resource, and the privacy posture the closed field contract implements structurally. |
| P2 | `plugins/relay/commands/relay-execute.md` | 918-926 | The `orchestrator-run.json` shape inconsistency (`stage`/`outcome` entries versus a `status`-keyed completion record) the codebook must record rather than normalize away. |

## Patterns to Mirror

```
# SOURCE: plugins/relay/resources/test-output-schema.md:24-114
  ## Schema v1 (json block)
  ### Field semantics (table)
  ### What is NOT in the schema
  ## Versioning
```
Task 1 copies this heading sequence as the document's skeleton; Task 2 repeats the `### Field semantics` sub-structure once per relation.

```
# SOURCE: plugins/relay/resources/test-output-schema.md:99-114
Schema version is implied by the presence/absence of fields... Breaking
changes... require a new `schema_version` field at the top and dual-write
compatibility for at least one relay release.
```
Task 1 mirrors this versioning rule, adapting it to version-in-filename (a TSV shard has no per-row place to carry a version cheaply, and a filename version makes concatenation provably homogeneous).

```
# SOURCE: plugins/relay/agents/code-reviewer.md:764-775
"verdict": "APPROVED" | "CHANGES_REQUESTED" ... "action": "final_flip" |
"rubric_fail" | "revalidation_fail"
```
Task 3 copies these literals byte-for-byte into the closed-domain table for the `verdict` and `action` columns.

```
# SOURCE: plugins/relay/agents/plan-reviewer.md:1111-1137
Per-finding id taxonomy: R-COH-SUMMARY-TASKS-DRIFT ... R-COH-AC-TASK-DECOUPLED
... R-COH-PATTERN-TASK-DRIFT ... R-COH-MANDATORY-READING-IRRELEVANT ...
R-COH-OTHER-INTERNAL-CONTRADICTION
```
Task 3 cites this as the evidence that rubric ids are agent-owned and open; the codebook names the reviewer files as the resolution authority instead of freezing the list.

```
# SOURCE: plugins/relay/commands/relay-execute.md:918-926
{"phase": <N>, "status": "complete", "plan_path": "...", "timestamp": "..."}
vs {"phase": <N>, "stage": "plan", "outcome": "APPROVED", ...}
```
Task 2 records this real inconsistency in the `run` relation's field semantics rather than silently normalizing one shape into the other.

```
# SOURCE: plugins/relay/resources/redaction-policy.md:14-111
  ## Layer 1 — Invariant defaults ... ## Layer 2 — Per-project extensions ...
  ## Layer 3 — Known-informative-but-not-secret (documented, not redacted)
```
Task 4 mirrors this "state the exclusion explicitly, including what is deliberately NOT excluded" posture in the `## What is NOT in the schema` section.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/resources/usage-metrics-schema.md` | CREATE | The codebook itself — the sole deliverable of this phase. Created by Task 1 and extended in place by Tasks 2–4; the net action against the repository is a single file creation. |

## NOT Building (Scope Limits)

- **The materializer script.** `plugins/relay/scripts/usage-metrics.mjs` is Phase 2. This phase writes no executable code, per the PRD's own Phase 1 scope line ("the schema resource file only; no executable code").
- **The `PRPs/metrics/` directory, its `.gitattributes`, or its `.gitignore`.** Phase 3.
- **Registering the new basename in `scripts/validate/checks/plugin-root-resolvable.mjs`'s `OWNED_RESOURCES` array** (and correcting that array's "The eight resource basenames" comment). Phase 4 — "Validation + registry". Verified this does not break the build meanwhile: `figma-quota-resilience-phase1.test.mjs` iterates a fixed basename list and asserts existence, never a directory count.
- **Any emission, hook, or consent key.** Hooks are a MoSCoW `Won't` for this feature's MVP; the `usage_metrics` methodology key only becomes necessary if Phase 5 ever ships.
- **Token or cost columns.** No join key exists between a Claude Code session and a relay feature or phase; the PRD excludes the attribution outright.

## Step-by-Step Tasks

### Task 1: CREATE plugins/relay/resources/usage-metrics-schema.md — document frame

- **ACTION**: Create the file with a title, an intro paragraph naming the producer (Phase 2's materializer) and the consumer (a human, an AI, or a script that already holds the relay repository), and these three top-level sections in this order: `## Purpose and consumer contract`, `## File layout and naming`, `## Versioning`. `## Purpose and consumer contract` states that the data files carry bare codes and this document carries their meaning, citing the OpenTelemetry `schema_url` precedent by name. `## File layout and naming` fixes the shard naming grammar — `<relation>-v<MAJOR>-<YYYY-MM>.tsv` plus a `<relation>-v<MAJOR>-undated.tsv` shard for rows whose source carries no usable timestamp — and states that the schema version lives in the filename, never in a per-row column, so concatenating shards is provably homogeneous. `## Versioning` adapts `test-output-schema.md`'s rule: additive columns are appended at the end of a row and do not bump the version; a removed or retyped column is a breaking change that starts a new `v<MAJOR>` filename series and never rewrites existing shards. Delivers AC-A5.
- **MIRROR**: `# SOURCE: plugins/relay/resources/test-output-schema.md:24-114` (heading skeleton) and `# SOURCE: plugins/relay/resources/test-output-schema.md:99-114` (versioning rule).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  F=plugins/relay/resources/usage-metrics-schema.md
  test -f "$F" || { echo "FAIL: $F absent"; exit 1; }
  grep -q '^## Purpose and consumer contract$' "$F" || { echo "FAIL: missing Purpose section"; exit 1; }
  grep -q '^## File layout and naming$' "$F" || { echo "FAIL: missing File layout section"; exit 1; }
  grep -q '^## Versioning$' "$F" || { echo "FAIL: missing Versioning section"; exit 1; }
  grep -q 'undated' "$F" || { echo "FAIL: undated shard not documented"; exit 1; }
  echo "PASS: document frame present"
  ```

### Task 2: UPDATE plugins/relay/resources/usage-metrics-schema.md — the four relation sections

- **ACTION**: Append four sections, in this order: `## Relation: verdict`, `## Relation: rubric`, `## Relation: run`, `## Relation: scan`. Each opens with one sentence naming its grain (verdict: one row per reviewer verdict line; rubric: one row per rubric row within a verdict; run: one row per `(feat, phase, stage)` observed in `orchestrator-run.json` / `run.json`; scan: one row per materialization), then a fenced example row, then a `### Field semantics` table with one row per column carrying `Column | Domain | Meaning | Contractual`. Every relation carries `proj` (stable, human-readable project id) and `ts`; `verdict` and `rubric` additionally carry `deg` for the degraded-timestamp flag. The `run` section records verbatim the real shape inconsistency in `orchestrator-run.json` — stage entries keyed `stage`/`outcome` versus a per-phase completion record keyed `status` — as a documented reading rule rather than normalizing one into the other. The `scan` section documents `pv` (plugin version observed at materialization time) and states plainly that it bounds rows between known versions rather than stamping each row, and that it is also the liveness signal that distinguishes a stopped collector from an idle project. Delivers AC-A2 and AC-A3.
- **MIRROR**: `# SOURCE: plugins/relay/resources/test-output-schema.md:24-114` (the `### Field semantics` table sub-structure) and `# SOURCE: plugins/relay/commands/relay-execute.md:918-926` (the inconsistency to record).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  F=plugins/relay/resources/usage-metrics-schema.md
  for H in verdict rubric run scan; do
    grep -q "^## Relation: $H\$" "$F" || { echo "FAIL: missing relation section $H"; exit 1; }
  done
  N=$(grep -c '^### Field semantics$' "$F" || true)
  test "$N" -eq 4 || { echo "FAIL: expected 4 Field semantics tables, found $N"; exit 1; }
  echo "PASS: four relation sections present"
  ```

### Task 3: UPDATE plugins/relay/resources/usage-metrics-schema.md — field contract and enum domains

- **ACTION**: Append `## Field contract` and `## Enum domains`. `## Field contract` states the closed rule: every value in every relation is one of an enumerated code, a non-negative integer, an ISO-8601 UTC instant, or the single `-` sentinel; no free-text column exists in any relation; and no value may contain a tab, a CR, or a newline (which is what makes unquoted TSV safe). It also documents the natural composite key of each relation — `(proj, stage, art, seq)` for verdict and rubric, `(proj, feat, phase, stage)` for run, `(proj, ts)` for scan — and states that content-hashing a progressively-written source is forbidden, naming `orchestrator-run.json` as the concrete case because it is appended to per stage and later receives a post-merge write-back. `## Enum domains` gives the closed domains verbatim from their producers — `verdict` as `APPROVED` / `CHANGES_REQUESTED` (plus the arbitration values `DISPUTE_REJECTED`, `DISPUTE_UPHELD_TEST_WRONG`, `DISPUTE_UPHELD_PRD_AMBIGUOUS`), `action` as `final_flip` / `rubric_fail` / `revalidation_fail` / `rubric_evaluation` — and then states the open-set rule: rubric check ids are NOT frozen here; they are resolved against the reviewer agent files, and a reader encountering an unknown id must treat it as a new check rather than as corrupt data. Note the observed cross-producer drift `FAILED_OSCILLATION` (relay-test) versus `FAILED_OSCILLATION_DETECTED` (relay-implement / relay-execute) as two distinct literals rather than one shared value. Delivers AC-A1 and AC-A4.
- **MIRROR**: `# SOURCE: plugins/relay/agents/code-reviewer.md:764-775` (the verbatim verdict/action literals) and `# SOURCE: plugins/relay/agents/plan-reviewer.md:1111-1137` (evidence that ids are agent-owned and open).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  F=plugins/relay/resources/usage-metrics-schema.md
  grep -q '^## Field contract$' "$F" || { echo "FAIL: missing Field contract section"; exit 1; }
  grep -q '^## Enum domains$' "$F" || { echo "FAIL: missing Enum domains section"; exit 1; }
  grep -q 'FAILED_OSCILLATION_DETECTED' "$F" || { echo "FAIL: producer literal drift not recorded"; exit 1; }
  grep -q 'rubric_evaluation' "$F" || { echo "FAIL: action domain incomplete"; exit 1; }
  echo "PASS: field contract and enum domains stated"
  ```

### Task 4: UPDATE plugins/relay/resources/usage-metrics-schema.md — exclusions section

- **ACTION**: Append `## What is NOT in the schema`, listing what is deliberately absent and why, in the explicit-exclusion posture `redaction-policy.md` uses: no prose or free-text reason strings (they dominate the byte size of the source corpus and are the only place a secret could land); no file paths; no diff or code content; no token or cost columns (no join key exists between a Claude Code session and a relay feature or phase); no per-row plugin-version stamp (that would require emission in the hot path, which the zero-token constraint forbids — the `scan` relation bounds it instead); and no personal or per-author identity of any kind. Close the section by naming the one residual project-identifying value — feature and artifact slugs — as documented-not-redacted, matching redaction-policy Layer 3's posture rather than claiming the artifact is anonymous. Delivers AC-A1.
- **MIRROR**: `# SOURCE: plugins/relay/resources/redaction-policy.md:14-111` (explicit-exclusion, including what is deliberately not excluded).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  F=plugins/relay/resources/usage-metrics-schema.md
  grep -q '^## What is NOT in the schema$' "$F" || { echo "FAIL: missing exclusions section"; exit 1; }
  grep -q 'documented-not-redacted' "$F" || { echo "FAIL: residual slug posture not stated"; exit 1; }
  echo "PASS: exclusions stated"
  ```

## Validation Commands

**Level 1 STATIC_ANALYSIS**

```bash
set -euo pipefail
F=plugins/relay/resources/usage-metrics-schema.md
test -f "$F" || { echo "FAIL: $F absent"; exit 1; }
# Every fenced block opens and closes: an odd count means an unterminated fence.
FENCES=$(grep -c '^```' "$F" || true)
if [ $((FENCES % 2)) -ne 0 ]; then
  echo "FAIL: unbalanced code fences in $F ($FENCES)"; exit 1
fi
# The document must contain at least one worked example block.
if [ "$FENCES" -lt 2 ]; then
  echo "FAIL: no fenced example block in $F"; exit 1
fi
echo "PASS: markdown structure sound"
```

**Level 2 CONTENT_INVARIANTS**

```bash
set -euo pipefail
F=plugins/relay/resources/usage-metrics-schema.md
# All nine mandated top-level sections, in the document.
for H in \
  '^## Purpose and consumer contract$' \
  '^## File layout and naming$' \
  '^## Versioning$' \
  '^## Relation: verdict$' \
  '^## Relation: rubric$' \
  '^## Relation: run$' \
  '^## Relation: scan$' \
  '^## Field contract$' \
  '^## Enum domains$' \
  '^## What is NOT in the schema$' ; do
  grep -q "$H" "$F" || { echo "FAIL: missing section matching $H"; exit 1; }
done
# One Field semantics table per relation.
N=$(grep -c '^### Field semantics$' "$F" || true)
test "$N" -eq 4 || { echo "FAIL: expected 4 Field semantics tables, found $N"; exit 1; }
# The sentinel and the closed-contract vocabulary are actually stated.
grep -q 'ISO-8601' "$F" || { echo "FAIL: instant format not stated"; exit 1; }
grep -q 'non-negative integer' "$F" || { echo "FAIL: integer domain not stated"; exit 1; }
echo "PASS: content invariants hold"
```

**Level 3 DRY-RUN END-TO-END**

```bash
set -euo pipefail
# Every ${CLAUDE_PLUGIN_ROOT}/resources/ citation this file introduces must
# resolve to a real packaged resource; a dangling citation is what
# path-existence.mjs fails the build on.
F=plugins/relay/resources/usage-metrics-schema.md
CITED=$(grep -oE '\$\{CLAUDE_PLUGIN_ROOT\}/resources/[A-Za-z0-9._-]+' "$F" \
  | sed 's|.*/resources/||' | sort -u || true)
for BASENAME in $CITED; do
  if [ ! -f "plugins/relay/resources/$BASENAME" ]; then
    echo "FAIL: cited resource does not exist: $BASENAME"; exit 1
  fi
done
# The repo's own 12-check suite must stay green with the new file present.
npm run validate || { echo "FAIL: npm run validate is red"; exit 1; }
echo "PASS: citations resolve and the validation suite is green"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-7):** Given the codebook, when any column of any relation is looked up, then its documented domain is exactly one of: an enumerated code, a non-negative integer, an ISO-8601 UTC instant, or the `-` sentinel — and the document states in `## Field contract` that no free-text column exists in any relation and that no value may contain a tab, CR, or newline.
- **AC-A2 (PRD AC-4):** Given the codebook, when the four relations' field-semantics tables are read, then every one of them documents a `proj` column, so rows from two projects concatenated into one file remain attributable to their origin.
- **AC-A3 (PRD AC-8):** Given the codebook, when the degraded-timestamp handling is looked up, then the `deg` column is documented on the `verdict` and `rubric` relations together with the rule that a degraded row is excluded at read time with a named, counted warning and its source is never rewritten.
- **AC-A4 (PRD AC-3):** Given the codebook, when the identity of a row is looked up, then each relation's natural composite key is documented, and `## Field contract` explicitly forbids content-hashing a progressively-written source, naming `orchestrator-run.json` as the concrete case.
- **AC-A5 (PRD AC-1):** Given the codebook, when the versioning rule is looked up, then the schema version is documented as living in the shard filename rather than a per-row column, with additive columns not bumping the version and a breaking change starting a new filename series without rewriting existing shards.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| No existing resource documents a TSV/columnar format — every sibling documents JSON or JSONL, so the format half of the codebook has no in-repo precedent to mirror | H | M | Mirror only the prose structure of `test-output-schema.md` (schema example → field semantics → exclusions → versioning); the TSV specifics are stated explicitly rather than assumed familiar |
| The `scan` relation has no precedent anywhere in the codebase — nothing resembling it exists today | M | M | Document its grain and purpose in full (version bounding plus liveness) rather than by analogy; Phase 2 implements it against this description |
| The `-` sentinel rule has no precedent in `test-output-schema.md` or `redaction-policy.md` | M | L | State the rule explicitly with a worked example; the single-sentinel choice matches statistical-codebook practice, which collapses missing/not-applicable into one code |
| A future reader treats an unknown rubric id as corrupt data | M | H | `## Enum domains` states the open-set rule explicitly and names the reviewer agent files as the id-resolution authority |
| `plugin-root-resolvable.mjs`'s `OWNED_RESOURCES` array (and its "The eight resource basenames" comment) will not cover the new file until Phase 4 | H | L | Recorded in `## NOT Building`; verified no existing test asserts a directory count, so the build stays green in the interim |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- `phase_type: docs` — the `## Files to Change` table contains exactly one markdown file and no application source.
- **Validation blocks use explicit `|| { echo "FAIL: …"; exit 1; }` guards rather than relying on `set -euo pipefail` alone.** This was verified empirically against this repository's shell before the plan was finalized: `( set -e; false; echo REACHED )` prints `REACHED` and exits 0 here, so a block whose last line is an `echo` would always exit 0 and the `code-reviewer`'s R-L1/R-L2/R-L3 gate ("PASS iff exit code 0") would be cosmetic. `set -euo pipefail` is retained as a second line of defense. `grep -P` is also unusable in this environment (`grep: -P supports only unibyte and UTF-8 locales`, exit 2), so no validation command in this plan uses it.
- Each block was run against the unmodified tree in both polarities before this plan was submitted for review: every Level and per-task command exits 1 with a named `FAIL:` line while the deliverable is absent, and the same form exits 0 against an existing file that satisfies the invariant.
- Two real inconsistencies surfaced during grounding and are deliberately recorded in the codebook rather than normalized away: the `orchestrator-run.json` stage-entry versus completion-record shape difference, and the `FAILED_OSCILLATION` / `FAILED_OSCILLATION_DETECTED` literal drift across producers. A codebook that silently picked one of each would misdescribe the data on disk.

*Generated: 2026-08-13*
*Approved: 2026-08-13*
*Status: IMPLEMENTED*
