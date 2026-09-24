# Feature: Drift gate (Phase 4 of hybrid-code-review)

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting change to a reviewer agent (a new gate-read
  step inside `code-reviewer`'s hybrid pass section); a new deterministic
  `npm run validate` check; new relay-repo-local artifacts under
  `plugins/relay/resources/` and `PRPs/reports/code-review-evaluation/`; no new
  `docs/context/methodology.md` key
- Decisions found:
  - [2026-09-21] "Code-review evaluation outcome: improve" — decision point 4
    names this phase's exact design: "the pinned sample set (`build-samples.sh`,
    plus the `MATCH-RELAY` and `STILL-PRESENT` rows of `findings-sheet.md`) is
    the regression set for the unversioned skill. Falling below a recall
    threshold that the PRD sets disables the hybrid pass, with a logged
    fallback to today's reviewer, until the set is re-baselined."
  - [2026-09-21] same entry, Open Questions list — "the drift gate and its
    threshold" was left for this PRD to decide; the PRD (AC-12, Success
    Metrics) sets the threshold at 8 of 10
  - [2026-08-28] "Review agents never mutate the target working tree" — the
    gate-read step this phase adds to `code-reviewer` is a single `Read` of a
    relay-repo-local file, never a write to the target project
  - [2026-09-17] entry 96 (mechanical checks move to deterministic scripts) —
    the gate's structural verification belongs in `scripts/validate/`, not in
    reviewer prose judgment
  - [2026-07-31] the `CONSUMERS` registry for verdict-log readers — checked and
    found inapplicable: this phase adds no new verdict-log field (the existing
    `hyb: 0` shape already covers "pass skipped")
  - [2026-08-03] `R-COH-VALIDATE-FRAMEWORK-MISMATCH` gains a condition-based
    test-pair-deferral exemption — confirms the precedent this plan's own
    Notes section invokes: Implementer-authored `VALIDATE` commands may
    exercise the change directly instead of the declared framework when no
    task touches a test file
- Applicable anti-patterns:
  - "Mutating a target project's working tree from a review agent" — the new
    gate-read step is read-only, over a relay-repo-local resource file, not
    the target project
  - "Flipping `figma_track` (or any future opt-in gating key) by heuristic" —
    the analogous rule here: the gate's `disabled` value is only ever written
    by the explicit `record-drift-gate-result.mjs` script, never inferred
  - "Writing pipeline artifacts under `.claude/`" — every new path in this
    plan resolves under `plugins/relay/`, `scripts/`, or `PRPs/reports/`
- Applicable architectural rules:
  - the writer/reviewer pair model — this phase adds no new writer/reviewer
    pair; `code-reviewer` stays the sole verdict owner and the COMMAND still
    owns D8 mutations
  - the diff-base contract — untouched; the gate-read step performs no `git
    diff` of its own
  - `PRPs/` artifact paths — the expectations ledger is a `PRPs/reports/`
    artifact; the shipped default status file is a `plugins/relay/resources/`
    plugin asset (installed via `${CLAUDE_PLUGIN_ROOT}`), mirroring
    `executable-content-hash.mjs`'s own installed-script precedent
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/hybrid-code-review.prd.md` — Implementation Phases row 4:
  "Drift gate" — Goal: detect the unversioned skill changing under relay —
  Success signal: a deliberately degraded expectation set trips the gate and
  disables the pass with a logged reason.

## Summary

This phase turns the pinned sample set from the 2026-09-21 evaluation
(`build-samples.sh` + the `STILL-PRESENT`/`MATCH-RELAY` rows of
`findings-sheet.md`) into the "regression set for the unversioned skill" that
`docs/decisions.md` [2026-09-21] decision point 4 already committed relay to
building. It resolves the PRD's open question on *who runs the gate* by
splitting the gate into two halves with different owners: a **recorded-verdict
half** — a small JSON file (`plugins/relay/resources/drift-gate-status.json`)
that `code-reviewer`'s hybrid pass section reads before every invocation, plus
a fast, offline, deterministic `npm run validate` check that verifies the file
is well-formed and that the reviewer prompt actually wires it — and a
**measurement half** — re-running `/code-review high` over the ten samples and
comparing recall against `findings-sheet.md`, done by an operator (or an
agent dispatched for the purpose) at plugin-update time, never inside `npm run
validate`, and recorded via a new `record-drift-gate-result.mjs` script. The
mandatory sanctioned disable switch (`hybrid_code_review` in
`methodology.md`) is left completely alone; the gate's outcome reaches the
reviewer through the recorded-verdict file it reads, exactly the second option
named in the calling instruction ("a recorded gate verdict the reviewer
reads").

## User Story

As a relay maintainer running the hybrid `/code-review` pass against an
unversioned, externally-updated skill
I want a repeatable, cheap check that recall on a pinned set of known defects
has not silently regressed, and an automatic disable-with-reason when it has
So that a `/code-review` behavior change under relay never silently
degrades the pass into passing everything, without anyone finding out until
a real defect ships

## Problem Statement

Narrowed to this phase: Phases 1-3 shipped the opt-in key, the pass itself,
and the adjudication logic, but nothing detects when the underlying
`/code-review` skill's behavior drifts — its non-determinism and lack of
versioning mean a future Claude Code release could quietly stop finding the
defects it found in the 2026-09-21 evaluation, and the hybrid pass would keep
running as if nothing changed, defeating the "genuine defects found" success
metric while adding nothing but latency. The gate must also not become a cost
sink: a check that re-runs `/code-review` over ten samples inside `npm run
validate` would make the fast, offline validation suite slow and
network/tool-dependent, directly contradicting the suite's own contract.

## Solution Statement

Introduce three new relay-repo-local artifacts and one insertion into
`code-reviewer.md`'s hybrid pass section:

1. `PRPs/reports/code-review-evaluation/drift-gate-expectations.json` — the
   ten distinct `STILL-PRESENT`/`MATCH-RELAY` defects from
   `findings-sheet.md`, cited by sample id and row, as the fixed recall
   denominator.
2. `plugins/relay/resources/drift-gate-status.json` — the shipped default
   recorded-verdict file (`disabled: false`, `recall: null`, `threshold: 8`,
   `sample_count: 10`), installed with the plugin like
   `executable-content-hash.mjs` already is.
3. `scripts/record-drift-gate-result.mjs` — a CLI an operator (or a
   measurement agent) runs after manually re-reviewing the ten samples with
   `/code-review high` and counting recovered defects against the
   expectations ledger; it writes the status file deterministically,
   computing `disabled = recall < threshold`.
4. A new `scripts/validate/checks/hybrid-drift-gate.mjs` check, registered in
   `scripts/validate/index.mjs`'s `CHECKS` array (mirroring the pure-function
   + thin-wrapper shape of `diff-base-form.mjs`), that verifies — fast,
   offline, no `Skill` invocation — the status file's schema, its
   `disabled`/`recall`/`threshold` internal consistency, and that
   `code-reviewer.md` actually reads it.
5. A new step 0 in `code-reviewer.md`'s `## The hybrid /code-review pass`
   section, before step 1, that reads the status file and — when
   `disabled: true` — skips the `Skill` invocation entirely with reason
   `DRIFT_GATE_DISABLED:<reason>`, mirroring step 1's own
   refusal-by-name shape. A missing or unreadable status file fails open
   (treated as `disabled: false`) rather than blocking the pass on the
   gate's own read failure — the gate protects against a *measured*
   regression, not against its own absence.

## Metadata

| Key | Value |
|-----|-------|
| Type | Feature |
| Complexity | Medium |
| Systems Affected | `plugins/relay/agents/code-reviewer.md`, `scripts/validate/index.mjs`, new files under `scripts/`, `scripts/validate/checks/`, `plugins/relay/resources/`, `PRPs/reports/code-review-evaluation/`, `CLAUDE.md`, `documentation/guide/validation-suite.html`, `documentation/changelog.html` |
| Dependencies | Phase 2 (`hybrid-code-review-phase-2-the-pass.plan.md`) — the hybrid pass section's numbered-step sequence this phase's Task 5 inserts step 0 into; Phase 3 (`hybrid-code-review-phase-3-adjudication-in-r-sem.plan.md`) — steps 9-11 this phase's insertion must not disturb |
| Estimated Tasks | 5 |
| Source PRD line ref | `PRPs/prds/hybrid-code-review.prd.md:171,191-194` (Implementation Phases row 4 + Phase Details) |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `plugins/relay/agents/code-reviewer.md` | 523-569 (CODE root) | The `## The hybrid /code-review pass` section's zero-effect paragraph and steps 1-8 — the exact insertion point (immediately after "When `hybrid_enabled == true`, evaluate the following steps in order:" and before step 1) and the refusal-by-name shape step 0 mirrors |
| P0 | `PRPs/reports/code-review-evaluation/findings-sheet.md` | 1-136 | The source of the ten pinned `STILL-PRESENT`/`MATCH-RELAY` defects this phase's expectations ledger cites by sample + row; also the label vocabulary (`STILL-PRESENT`, `MATCH-RELAY`, `LATER-FIXED`, etc.) the ledger must use verbatim |
| P0 | `PRPs/reports/code-review-evaluation/build-samples.sh` | 1-49 | The pinned sample-set builder this phase wires as the repeatable regression set (per `docs/decisions.md` [2026-09-21] point 4); the header comment documents the `Skill("code-review", "<level> <out-dir>/<id>")` re-review procedure the measurement half of this gate follows |
| P0 | `docs/decisions.md` | 2391-2431 | The `[2026-09-21]` decision entry — point 4 is this phase's exact design mandate, verbatim |
| P1 | `scripts/validate/checks/diff-base-form.mjs` | 1-141 | The pure-check-function + thin-I/O-wrapper module shape (`checkDiffBaseForm({...})` / `runDiffBaseFormCheck()`) this phase's new `hybrid-drift-gate.mjs` mirrors |
| P1 | `scripts/validate/index.mjs` | 19-92 | The `CHECKS` registry array and import list this phase's Task 4 adds one entry to; the "no short-circuit, run all checks" contract the new check must respect |
| P1 | `docs/context/code-review-registries.md` | 42-49 | The silent-degradation shape (`passed: true` + fixed reason string when the relevant declaration is absent) this phase's fail-open-on-unreadable-status-file behavior mirrors |
| P2 | `plugins/relay/resources/usage-metrics-schema.md` | 177-214, 361-369 | Confirms no verdict-log schema change is needed — this phase reuses the existing `hyb: 0` shape for a gate-disabled skip, adding no new field |
| P2 | `package.json` | 8-12 | The exact `npm run validate` script definition this phase's Level 1 command invokes unmodified |

## Patterns to Mirror

```
# SOURCE: plugins/relay/agents/code-reviewer.md:535-539
1. **Refusal-by-name guard.** When `hybrid_level` is not exactly
   `medium` or `high` (this covers `xhigh`, `max`, `ultra`, and any
   other value), set local state to `"refused"` with the literal
   marker `HYBRID_LEVEL_REFUSED` and reason `refused_level:<value>`,
   and do NOT invoke `Skill`.
```
Mirrored by Task 5 (the new step 0's "set local state to disabled, do NOT
invoke `Skill`" shape is the same refusal pattern, applied to a
gate-read result instead of a level check).

```
# SOURCE: scripts/validate/checks/diff-base-form.mjs:22-31,63-80,106-141
 * Exports:
 *   checkDiffBaseForm({ files }) — pure function, no file I/O. ...
 *   runDiffBaseFormCheck() — thin wrapper that reads every markdown file ...

export function checkDiffBaseForm({ files }) {
  ...
  return { name: CHECK_NAME, ok: findings.length === 0, findings };
}

export function runDiffBaseFormCheck() {
  ...
  return checkDiffBaseForm({ files });
}
```
Mirrored by Task 4 (`hybrid-drift-gate.mjs` exports a pure
`checkHybridDriftGate({ statusText, agentText })` plus a thin
`runHybridDriftGateCheck()` wrapper that reads the two real files and
delegates — same split, same "loud failure on missing/unreadable input,
never a throw, never a silent pass" discipline).

```
# SOURCE: scripts/validate/index.mjs:19-20,52-77
import { runVersionParityCheck } from './checks/version-parity.mjs';
...
const CHECKS = [
  runVersionParityCheck,
  ...
  runLaneFixtureCheck,
];
```
Mirrored by Task 4 (adds one import line and one array entry,
`runHybridDriftGateCheck`, at the end of the existing list — no
reordering of existing entries).

```
# SOURCE: docs/context/code-review-registries.md:42-49
## Empty-default behavior

When `registries: []` (or this file is absent from
`<target_root>/docs/context/`), the `R-COH-REGISTRY-MISSING` check
degrades silently — emits a single `passed: true` row with reason
"no registries declared; check skipped". This matches the source
PRD's principle of silent degradation for projects without the
relevant context.
```
Mirrored by Task 5 (the new step 0's explicit fail-open behavior on a
missing/unreadable status file — treat `disabled` as `false` and
continue, rather than blocking the pass on the gate's own absence).

```
# SOURCE: docs/decisions.md:2410
4. **Drift detection:** the pinned sample set (`build-samples.sh`, plus
the `MATCH-RELAY` and `STILL-PRESENT` rows of `findings-sheet.md`) is
the regression set for the unversioned skill. Falling below a recall
threshold that the PRD sets disables the hybrid pass, with a logged
fallback to today's reviewer, until the set is re-baselined.
```
Mirrored by Task 1 (the expectations ledger's ten entries are drawn
directly from this sentence's named sources) and by the phase's overall
design (Task 2/3/5 implement "falls below → disables → logged
fallback → re-baselined" verbatim).

## Files to Change

| File | Action | Justification |
|------|--------|----------------|
| `PRPs/reports/code-review-evaluation/drift-gate-expectations.json` | CREATE | The fixed ten-defect recall denominator, sourced from `findings-sheet.md` |
| `plugins/relay/resources/drift-gate-status.json` | CREATE | Shipped default recorded gate verdict, read by `code-reviewer.md`'s new step 0 |
| `scripts/record-drift-gate-result.mjs` | CREATE | CLI that records a measured recall run, computing `disabled` deterministically |
| `scripts/validate/checks/hybrid-drift-gate.mjs` | CREATE | Fast, offline `npm run validate` check verifying the status file's schema/consistency and the reviewer's wiring |
| `scripts/validate/index.mjs` | UPDATE | Register the new check in the `CHECKS` array |
| `plugins/relay/agents/code-reviewer.md` | UPDATE | Insert step 0 (drift gate check) before step 1 of the hybrid pass section |
| `CLAUDE.md` | UPDATE | Bump the Tier-1 onboarding line's static-check count `24` &rarr; `25` now that `hybrid-drift-gate` is registered |
| `documentation/guide/validation-suite.html` | UPDATE | Add a `hybrid-drift-gate` row to the `## the-checks` per-check reference table (one row per `CHECKS` array entry) |
| `documentation/changelog.html` | UPDATE | Add an `Unreleased` &rarr; `Added` entry for the new check, per `documentation/AGENTS.md` §6.3/§7 (the three-file registration rule extends to this table+count sync) |

## NOT Building (Scope Limits)

- No live re-run of `/code-review` inside `npm run validate` or inside any
  `scripts/validate/` check — the suite stays fast and offline; the
  measurement half of the gate is a documented manual (or separately
  agent-dispatched) procedure, never wired into the validate gate itself.
- No new `docs/context/methodology.md` key. The sanctioned disable switch
  (`hybrid_code_review`) is untouched; the gate's outcome reaches
  `code-reviewer` through the recorded-verdict file it reads, not through a
  second declared key.
- No change to R-X, arbitration, the dispute channel, or `/relay-code-review`
  (unchanged PRD exclusions).
- No new verdict-log field — a gate-disabled skip reuses the existing
  `hyb: 0` shape Phase 2 already defined for "pass not invoked."
- No dedicated `/relay-*` command for running the measurement — the PRD's
  open question is resolved in favor of the cheapest real option (a fast
  `npm run validate` structural check plus a small recording script), not a
  new command surface.
- No target-project dogfood, no default-level decision (Phase 5).

## Step-by-Step Tasks

### Task 1: CREATE PRPs/reports/code-review-evaluation/drift-gate-expectations.json

- **ACTION**: Create a JSON file with the shape
  `{ "defects": [ { "id": "d1".."d10", "sample": "<sample id>", "ref": "<row ref, e.g. C1>", "description": "<one-line defect description>", "label": "STILL-PRESENT" | "MATCH-RELAY" } ] }`,
  populated with exactly these ten entries, drawn verbatim from
  `findings-sheet.md` (deduplicated across repeated samples — `s1`/`s2` and
  `s3`/`s4` each report the same underlying defect twice; only the first
  occurrence is listed):
  1. `sample: "s1", ref: "C1"` — "version-parity.mjs: strict equality breaks
     the AGENTS.md §7.5 doc-only patch exemption" — `STILL-PRESENT`
  2. `sample: "s1", ref: "C2"` — "heading regex skips headings with inline
     markup or attributes before id, so the check falls through to an older
     release" — `STILL-PRESENT`
  3. `sample: "s3", ref: "C4"` — "NEXT_POINTER_RE has no lookbehind, so path
     segments read as commands" — `STILL-PRESENT`
  4. `sample: "s5f", ref: "C1"` — "generate-final-report.mjs
     loadOpenPlanReviewAdvisories reads the last review.jsonl line without
     checking verdict" — `STILL-PRESENT`
  5. `sample: "s5f", ref: "C3"` — "efficiency.mjs: comment says entries
     without failClasses count as blocking, but ?? [] drops them" —
     `STILL-PRESENT`
  6. `sample: "s6f", ref: "C1"` — "docs-updater dispatch lacks feature/prd_path"
     — `MATCH-RELAY`
  7. `sample: "s6f", ref: "C2"` — "docs-reviewer cannot derive feature without
     pr; the line-393 justification is false" — `MATCH-RELAY`
  8. `sample: "s10", ref: "C3"` — "zero-evidence branch only defined for
     quota refusals (HC10 contradiction)" — `MATCH-RELAY`
  9. `sample: "s12", ref: "C1"` — "commit -m with an unescaped PRD title;
     backticks or $ break or inject" — `STILL-PRESENT`
  10. `sample: "s13", ref: "C4"` — "docs_sync: false is read by nothing" —
      `MATCH-RELAY`

  Also add a top-level `"threshold": 8` and `"source": "findings-sheet.md"`
  key alongside `"defects"`. This file is the fixed recall denominator: the
  measurement procedure re-runs `/code-review high` over
  `build-samples.sh`'s ten sample repos and counts how many of these ten
  descriptions the pass's own findings text recovers.
- **MIRROR**: `# SOURCE: docs/decisions.md:2410`
- **AC**: AC-A2 (PRD AC-12)
- **VALIDATE**: `node -e "const fs=require('fs');const e=JSON.parse(fs.readFileSync('PRPs/reports/code-review-evaluation/drift-gate-expectations.json','utf8'));if(!Array.isArray(e.defects)||e.defects.length!==10){console.error('FAIL: expected exactly 10 defects, got '+(e.defects?e.defects.length:'none'));process.exit(1);}if(!e.defects.every(d=>d.label==='STILL-PRESENT'||d.label==='MATCH-RELAY')){console.error('FAIL: unexpected label value');process.exit(1);}console.log('PASS: 10 pinned defects with valid labels');"`

### Task 2: CREATE plugins/relay/resources/drift-gate-status.json

- **ACTION**: Create the shipped default recorded-verdict file, installed
  with the plugin (readable at
  `${CLAUDE_PLUGIN_ROOT}/resources/drift-gate-status.json` once installed,
  mirroring `${CLAUDE_PLUGIN_ROOT}/scripts/executable-content-hash.mjs`'s
  own installed-resource precedent):
  ```json
  {
    "disabled": false,
    "reason": null,
    "recall": null,
    "threshold": 8,
    "sample_count": 10,
    "measured_at": null
  }
  ```
  `disabled: false` is the shipped default (no measurement has ever run
  against this checkout); `record-drift-gate-result.mjs` (Task 3) is the
  only sanctioned writer of this file after today.
- **MIRROR**: `# SOURCE: docs/decisions.md:2410`
- **AC**: AC-A1 (PRD AC-12)
- **VALIDATE**: `node -e "const fs=require('fs');const s=JSON.parse(fs.readFileSync('plugins/relay/resources/drift-gate-status.json','utf8'));const req=['disabled','reason','recall','threshold','sample_count','measured_at'];for(const k of req){if(!(k in s)){console.error('FAIL: missing key '+k);process.exit(1);}}if(s.disabled!==false||s.threshold!==8||s.sample_count!==10){console.error('FAIL: unexpected default values');process.exit(1);}console.log('PASS: default drift-gate-status.json well-formed');"`

### Task 3: CREATE scripts/record-drift-gate-result.mjs

- **ACTION**: Create a Node CLI, no npm dependencies (mirroring the "no npm
  dependencies" runtime constraint documented in `scripts/validate/index.mjs`'s
  header comment), that:
  - Parses `--recall <int>`, `--threshold <int>` (default `8`), `--reason
    <string>` (optional), and `--status-path <path>` (default
    `plugins/relay/resources/drift-gate-status.json`) from `process.argv`.
  - Exits `1` with a message on `stderr` when `--recall` is missing,
    non-numeric, or negative, or when `--threshold` is non-numeric or
    negative.
  - Reads `PRPs/reports/code-review-evaluation/drift-gate-expectations.json`
    to derive `sample_count` as `defects.length` (never hardcoded), falling
    back to `10` with a `stderr` warning if the expectations file is
    unreadable — a warning, not a hard failure, since a missing expectations
    file should not block recording a result computed by hand.
  - Computes `disabled = recall < threshold`.
  - Writes `{ disabled, reason: disabled ? (reason || `recall ${recall}/${threshold} below threshold`) : null, recall, threshold, sample_count, measured_at: new Date().toISOString() }`
    to `--status-path`, pretty-printed (`JSON.stringify(obj, null, 2) + '\n'`).
  - Exits `0` and prints a one-line summary on success.
- **MIRROR**: `# SOURCE: scripts/validate/checks/diff-base-form.mjs:106-141` (the "loud failure on bad input, never a throw" discipline, applied to a CLI's argument parsing instead of a file-read)
- **AC**: AC-A1 (PRD AC-12), AC-A4 (PRD AC-12 — re-baselining)
- **VALIDATE**: `set -euo pipefail
if node scripts/record-drift-gate-result.mjs --recall notanumber --threshold 8 2>/dev/null; then echo "FAIL: expected non-zero exit for non-numeric recall"; exit 1; fi
if node scripts/record-drift-gate-result.mjs --threshold 8 2>/dev/null; then echo "FAIL: expected non-zero exit for missing --recall"; exit 1; fi
echo "PASS: record script rejects invalid/missing arguments with non-zero exit"`

### Task 4: CREATE scripts/validate/checks/hybrid-drift-gate.mjs; UPDATE scripts/validate/index.mjs, CLAUDE.md, documentation/guide/validation-suite.html, documentation/changelog.html

- **ACTION**: Create `scripts/validate/checks/hybrid-drift-gate.mjs`
  exporting a pure `checkHybridDriftGate({ statusText, agentText })` and a
  thin wrapper `runHybridDriftGateCheck()` (same split as
  `diff-base-form.mjs`). The pure function:
  - Fails (`ok: false`, a finding) if `statusText` is missing/unreadable, or
    fails to `JSON.parse`, or is missing any of `disabled`, `reason`,
    `recall`, `threshold`, `sample_count`, `measured_at`.
  - Fails if `recall` is not `null` and `disabled !== (recall < threshold)`
    — the recorded `disabled` flag must be internally consistent with
    `recall`/`threshold` (catches a hand-edited or stale file).
  - Fails if `disabled === true` and `reason` is falsy or an empty string —
    a disabled gate must always carry a logged reason (AC-12).
  - Fails if `agentText` (the contents of `code-reviewer.md`) does not
    contain both the literal substring `DRIFT_GATE_DISABLED` and the literal
    substring `resources/drift-gate-status.json` — the structural
    "reviewer actually wires the gate" check.
  - Never invokes `Skill`, never shells out, never performs a live
    `/code-review` re-review — the check is a pure read + parse + compare,
    consistent with the suite's fast/offline contract.

  The thin wrapper reads `plugins/relay/resources/drift-gate-status.json`
  and `plugins/relay/agents/code-reviewer.md` via `readFileSync`
  (`null` on a missing/unreadable file, per `diff-base-form.mjs`'s own
  convention) and delegates.

  Then, in `scripts/validate/index.mjs`, add
  `import { runHybridDriftGateCheck } from './checks/hybrid-drift-gate.mjs';`
  after the existing `runLaneFixtureCheck` import (line 42), and append
  `runHybridDriftGateCheck,` as the last entry of the `CHECKS` array (after
  `runLaneFixtureCheck,`, line 76) — no reordering of existing entries.

  Registering a 25th check moves the plugin's static-check count out of
  sync with two places that state the old count of 24 (a staleness class
  this repo has already hit twice — `decisions-mirror` and
  `anti-patterns-mirror` exist to catch its siblings). Fix both in this
  same task, per `documentation/AGENTS.md` §6/§7 (registration + changelog
  are coupled edits, not a follow-up):
  - In `CLAUDE.md`, change the Essential commands line reading
    `(24 static consistency checks; docs at documentation/guide/validation-suite.html).`
    to read
    `(25 static consistency checks; docs at documentation/guide/validation-suite.html).`
    — count bump only, no other wording change.
  - In `documentation/guide/validation-suite.html`, inside the `##
    the-checks` table's `<tbody>`, append one new row after the existing
    `lane-fixture` row (immediately before `</tbody>`), following the exact
    two-column `<tr><td><code>...</code></td><td>...</td></tr>` shape every
    other row uses:
    `<tr><td><code>hybrid-drift-gate</code></td><td>Verifies
    <code>plugins/relay/resources/drift-gate-status.json</code>'s schema,
    its <code>disabled</code>/<code>recall</code>/<code>threshold</code>
    internal consistency, and that
    <code>plugins/relay/agents/code-reviewer.md</code>'s hybrid pass
    section actually reads it &mdash; fast, offline, no <code>Skill</code>
    invocation.</td></tr>`
    This is the per-check reference table the doc-site's own
    `registration-parity`-adjacent convention (one row per `CHECKS` array
    entry) requires; leave every existing row byte-identical.
  - In `documentation/changelog.html`, under the existing `<h2
    id="unreleased">Unreleased</h2>` block's `<h3
    id="unreleased-added">Added</h3>` `<ul>`, append one new `<li>` (after
    the existing "Decisions — entry 101" item, before `</ul>`), matching
    the existing bold-link-plus-mdash-description shape:
    `<li><strong><a href="guide/validation-suite.html#the-checks">Validation
    suite &mdash; <code>hybrid-drift-gate</code> check</a></strong>
    &mdash; a 25th <code>npm run validate</code> check verifies the drift
    gate's recorded-verdict file
    (<code>plugins/relay/resources/drift-gate-status.json</code>) is
    well-formed, internally consistent, and actually wired into
    <code>code-reviewer.md</code>'s hybrid pass. <code>CLAUDE.md</code>'s
    check count is bumped <code>24</code> &rarr; <code>25</code> to
    match.</li>`
    Per `documentation/AGENTS.md` §7.1, this is a **Minor** doc-site
    change (new table row + new reference content) — leave the version
    heading alone; the `Unreleased` block accumulates until a release is
    cut, which is out of scope for this phase (no plugin.json version bump
    here — §7.5 only fires when a release is *cut*, not while `Unreleased`
    is accumulating). Do not add any new CSS, JS, inline `style=`
    attribute, or emoji — plain text and the existing `<strong>`/`<a>`/
    `<code>` tags only, per `documentation/AGENTS.md` §2.
- **MIRROR**: `# SOURCE: scripts/validate/checks/diff-base-form.mjs:22-31,63-104` and `# SOURCE: scripts/validate/index.mjs:19-20,52-77`
- **AC**: AC-A3 (PRD AC-12 — who runs the gate) for the check itself; the
  `CLAUDE.md`/doc-site/changelog sync is pure registration hygiene with no
  dedicated PRD AC — exempted from an AC citation per the plan-writer
  hard-constraint carve-out, and enforced instead by the VALIDATE below
  (mirroring how `version-parity`/`registration-parity` are structural
  gates, not AC-tied feature behavior).
- **VALIDATE**: `set -euo pipefail
grep -q 'runHybridDriftGateCheck' scripts/validate/index.mjs
grep -q '25 static consistency checks' CLAUDE.md
if grep -q '24 static consistency checks' CLAUDE.md; then echo "FAIL: CLAUDE.md still says 24"; exit 1; fi
grep -q 'hybrid-drift-gate' documentation/guide/validation-suite.html
grep -q 'hybrid-drift-gate' documentation/changelog.html
npm run validate

### Task 5: UPDATE plugins/relay/agents/code-reviewer.md (drift gate check, step 0)

- **ACTION**: In the `## The hybrid /code-review pass` section, immediately
  after the sentence "When `hybrid_enabled == true`, evaluate the following
  steps in order:" and immediately before step 1 ("**Refusal-by-name
  guard.**"), insert:

  "0. **Drift gate check (independent of `hybrid_level`).** Read
  `${CLAUDE_PLUGIN_ROOT}/resources/drift-gate-status.json` via `Read`. If the
  file is missing, unreadable, or fails to parse, treat `disabled` as
  `false` — a gate-read failure fails OPEN, never blocking the pass on the
  gate's own absence — and continue to step 1. If the parsed value's
  `disabled` field is `true`, set local state to `"disabled"` with reason
  `DRIFT_GATE_DISABLED:<the file's reason field verbatim>`, do NOT invoke
  `Skill`, and proceed directly to Phase 4's verdict assembly with `hyb: 0`
  — the same verdict shape already defined for 'pass never reaches the
  invoked state.' Otherwise (`disabled: false`), continue to step 1
  unaffected."

  Do NOT renumber steps 1-11 — they keep their existing numbers; step 0
  is a new predecessor, not a re-index. Do NOT insert anything inside the
  R-X section (the pinned span between the R-X heading and the `## The
  hybrid /code-review pass` heading) — this insertion targets only the
  hybrid pass section's own body, well past that boundary.
- **MIRROR**: `# SOURCE: plugins/relay/agents/code-reviewer.md:535-539` and `# SOURCE: docs/context/code-review-registries.md:42-49`
- **AC**: AC-A1 (PRD AC-12)
- **VALIDATE**: `set -euo pipefail
grep -q 'Drift gate check (independent of' plugins/relay/agents/code-reviewer.md
grep -q 'DRIFT_GATE_DISABLED' plugins/relay/agents/code-reviewer.md
grep -q 'resources/drift-gate-status.json' plugins/relay/agents/code-reviewer.md
echo "PASS: drift gate step 0 wired into the hybrid pass section"`

## Validation Commands

**Level 1 STATIC_ANALYSIS**

```
npm run validate
```

Runs the full `scripts/validate/index.mjs` suite (now 25 checks, including
this phase's `hybrid-drift-gate` check) from the repository root. Exits
non-zero if any check fails (real tool exit code, no wrapping).

**Level 2 CONTENT_INVARIANTS**

```
set -euo pipefail
grep -q 'Drift gate check (independent of' plugins/relay/agents/code-reviewer.md
grep -q 'DRIFT_GATE_DISABLED' plugins/relay/agents/code-reviewer.md
grep -q 'resources/drift-gate-status.json' plugins/relay/agents/code-reviewer.md
grep -q '"threshold": 8' plugins/relay/resources/drift-gate-status.json
grep -q '"sample_count": 10' plugins/relay/resources/drift-gate-status.json
grep -q 'runHybridDriftGateCheck' scripts/validate/index.mjs
grep -q '25 static consistency checks' CLAUDE.md
if grep -q '24 static consistency checks' CLAUDE.md; then echo "FAIL: CLAUDE.md still says 24"; exit 1; fi
grep -q 'hybrid-drift-gate' documentation/guide/validation-suite.html
grep -q 'hybrid-drift-gate' documentation/changelog.html
node -e "const fs=require('fs');const e=JSON.parse(fs.readFileSync('PRPs/reports/code-review-evaluation/drift-gate-expectations.json','utf8'));if(!Array.isArray(e.defects)||e.defects.length!==10){console.error('FAIL: expected exactly 10 pinned defects');process.exit(1);}console.log('PASS: expectations ledger has 10 entries');"
echo "PASS: all Phase 4 markers present"
```

`set -euo pipefail` makes any single failing `grep -q` (or a non-zero
`node -e`) abort the whole block before the final `echo` runs.

**Level 3 DRY-RUN END-TO-END**

```
set -euo pipefail
cp plugins/relay/resources/drift-gate-status.json plugins/relay/resources/drift-gate-status.json.bak
node scripts/record-drift-gate-result.mjs --recall 5 --threshold 8 --status-path plugins/relay/resources/drift-gate-status.json
node -e "const fs=require('fs');const s=JSON.parse(fs.readFileSync('plugins/relay/resources/drift-gate-status.json','utf8'));if(s.disabled!==true){console.error('FAIL: expected disabled:true after recall(5) < threshold(8)');process.exit(1);}if(!s.reason){console.error('FAIL: expected a non-empty reason when disabled');process.exit(1);}console.log('PASS: a deliberately degraded recall disables the gate with a logged reason');"
mv plugins/relay/resources/drift-gate-status.json.bak plugins/relay/resources/drift-gate-status.json
node --test "scripts/validate/checks/*.test.mjs"
```

Exercises the exact scenario named in the Phase Details success signal — "a
deliberately degraded expectation set trips the gate and disables the pass
with a logged reason" — via the recording script, without invoking `Skill`
or the target's working tree; restores the original status file afterward so
this dry-run leaves no stray diff; then re-runs the existing `node:test`
corpus (glob form, per the documented `node --test <dir>` `MODULE_NOT_FOUND`
gotcha) to confirm no regression to any other check.

## Acceptance Criteria

- **AC-A1 (PRD AC-12):** Given the pinned sample set is re-run and a
  measured recall below the configured threshold is recorded via
  `record-drift-gate-result.mjs`, when `code-reviewer` next evaluates the
  hybrid pass section, then step 0 reads `disabled: true` from the status
  file and disables the pass — no `Skill` invocation, `hyb: 0` on the
  verdict, and a `DRIFT_GATE_DISABLED:<reason>` local-state reason — falling
  back to today's (Phase-1-shipped, pass-off) reviewer behavior.
- **AC-A2 (PRD AC-12):** Given the ten distinct `STILL-PRESENT`/`MATCH-RELAY`
  defects recorded in `findings-sheet.md`, when
  `drift-gate-expectations.json` is read, then it contains exactly those ten
  entries with a valid label on each — the fixed, reproducible recall
  denominator the PRD's Success Metrics table specifies (at least 8 of 10).
- **AC-A3 (PRD AC-12):** Given `npm run validate` runs, when the
  `hybrid-drift-gate` check evaluates, then it verifies the status file's
  schema, its `disabled`/`recall`/`threshold` consistency, and the
  reviewer's wiring — fast, offline, and without invoking `/code-review` —
  resolving the PRD's open question ("who runs the gate") in favor of a
  `npm run validate` check for the deterministic half, with the live
  measurement kept as a separate, explicitly-invoked procedure.
- **AC-A4 (PRD AC-12):** Given `record-drift-gate-result.mjs` is re-run with
  a recall at or above the threshold (the re-baselining procedure), when the
  status file is rewritten, then `disabled` reads `false` again and
  `code-reviewer`'s step 0 resumes invoking the pass — "until the set is
  re-baselined" is satisfied by the same recording script, not a separate
  mechanism.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| The gate never actually gets re-measured (no automated trigger re-runs `/code-review` over the ten samples) | M | M | Out of scope by design (PRD's own "no dedicated command" resolution favors a cheap, real, manually-triggered procedure over an unbuilt automated one); Phase 5's dogfood is the next point where a cadence decision is revisited |
| A gate-read failure (missing/corrupt status file) silently blocks the pass entirely | L | M | Task 5's step 0 explicitly fails OPEN on any read/parse failure, mirroring `code-review-registries.md`'s own silent-degradation precedent, rather than treating an unreadable gate as a reason to disable |
| The recorded `disabled` value drifts out of sync with its own `recall`/`threshold` fields (e.g., a hand-edit) | L | M | `hybrid-drift-gate.mjs` (Task 4) fails the `npm run validate` check on any such inconsistency, catching it before it reaches a shipped state |
| The insertion collides with the pinned R-X byte span, re-triggering the exhausted dispute cap from Phase 3 | L | H | Task 5's insertion point is inside the hybrid pass section's own body (well past the R-X-to-hybrid-pass boundary), never inside R-X's interior; Task 5's ACTION states this explicitly |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of
`tdd` in `docs/context/methodology.md`: **false**. Test-after
ordering — when a test framework is declared, the test pair
(test-writer/test-reviewer) authors and maintains the suite from the
Acceptance Criteria above, after the Implementer + Code Review; with
no framework declared, no tests are authored.

**Test-file routing:** this phase's test-file creation and updates are
routed through the `test-writer`/`test-reviewer` pair's lifecycle ledger
(`/relay-write-test` → `/relay-test-write-review`), not authored by the
Implementer — R-X is a blanket straight-fail on any test glob in the
Implementer's diff. No task above and no `## Files to Change` row targets a
test file, so this plan's `**VALIDATE**` commands exercise the change
directly rather than invoking the test framework for new coverage.

**On the CODE root / artifact plane split.** Per the calling instruction,
every `# SOURCE:` anchor, every insertion point, and every line range cited
in `## Mandatory Reading` for `plugins/relay/agents/code-reviewer.md` and
`scripts/validate/*.mjs` was verified against
`C:/repos/PRPs-agentic-eng/.worktrees/hybrid-code-review` — the worktree
carrying Phases 1-3's shipped-but-uncommitted state — not against this
plan's own `target_root`
(`C:/repos/PRPs-agentic-eng/.claude/worktrees/sharp-ardinghelli-112988`),
which holds no working copy of Phases 1-3's diff. This repeats Phase 2's and
Phase 3's own documented split. The Decision Gate sources
(`docs/decisions.md`, `docs/anti-patterns.md`, `docs/context/architecture.md`)
and this PRD were read from `target_root` per protocol, since that history
is already merged and identical in both trees. All paths in this plan's
tasks are written relative to a repository root, so they resolve correctly
when the Implementer executes them against the CODE root where Phases 1-3
actually live.

**On avoiding the two pinned byte spans.** The calling instruction flagged
two pinned spans in `plugins/relay/agents/code-reviewer.md` — the R-X
section, and the R-SEM "Not self-executing authorization" paragraph — and
noted this session's dispute cap is exhausted, making a collision
expensive. This plan's only edit to `code-reviewer.md` (Task 5) inserts
step 0 inside the `## The hybrid /code-review pass` section's own body
(well after both pinned spans: R-SEM's paragraph ends before R-X begins,
and R-X itself ends before the hybrid pass section begins) — never inside
either pinned span's interior. This was a deliberate anchor choice: Task 5
does not touch R-SEM's paragraph or R-X's section at all.

**Why the recall threshold and defect count are fixed constants copied from
the PRD, not re-derived.** The PRD's Success Metrics table already sets
"At least 8 of the 10 distinct `STILL-PRESENT` defects" as the recall
target; `drift-gate-status.json`'s shipped `threshold: 8` and
`sample_count: 10` are that number, not a fresh derivation. The
`sample_count` is additionally re-derived at record time from
`drift-gate-expectations.json`'s own length (Task 3), so a future change to
the pinned set's size self-corrects without a second edit.

**Why the measurement half is a manual/operator-triggered procedure, not
automated.** `build-samples.sh`'s own header comment already documents the
review procedure as a manual step: "Then review each sample with:
`Skill(\"code-review\", \"<level> <out-dir>/<id>\")`". Automating that loop
(rebuild ten samples, invoke the skill ten times, parse free-text findings,
diff against the expectations ledger) is real engineering effort with its
own failure modes (parsing drift, sample staleness) that the PRD's own
Open Questions leave unresolved beyond "who runs the gate" — this phase
answers that question for the cheap, real, deterministic half, and
explicitly leaves full automation of the measurement half out of scope
(see `## NOT Building`).

**Revision note (plan-reviewer attempt 1, blocking).** The original DRAFT's
Level 1 command already claimed `npm run validate` would run "now 25
checks" but touched neither `CLAUDE.md` (which states "24 static
consistency checks") nor `documentation/guide/validation-suite.html`'s
per-check reference table, nor `documentation/changelog.html` (bound by
`documentation/AGENTS.md`'s three-file registration rule once the doc-site
table changes). Task 4 — already the task that registers the new check in
`scripts/validate/index.mjs` — is extended to bump the count in `CLAUDE.md`,
add the `hybrid-drift-gate` row to the doc-site table, and add the
`Unreleased`/`Added` changelog entry, with a byte-exact VALIDATE for all
three plus a negative check that the stale `24` count is gone. `##
Files to Change` gains the three corresponding rows. No other task, AC,
anchor, or section changed.

*Generated: 2026-09-23*
*Approved: 2026-09-23*
*Status: IMPLEMENTED*
