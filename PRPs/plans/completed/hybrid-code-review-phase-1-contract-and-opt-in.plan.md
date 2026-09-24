# Feature: Contract and opt-in (Phase 1 of hybrid-code-review)

```
**Decision Gate**
- Active context: none
- Activated criteria: new opt-in gating key in docs/context/methodology.md; new consumer-visible fields in a verdict log (code-review.jsonl); cross-cutting schema change to a reviewer agent's rubric row shape
- Decisions found:
  - [2026-09-21] "Code-review evaluation outcome: improve" (entry 98) — mandates this PRD and fixes Phase 1's scope: the log changes only additively (e.g. a `source`-shaped field), registered with the verdict-log CONSUMERS; an opt-in `methodology.md` key is required before anything dispatches
  - [2026-08-06] BLOCKING/ADVISORY materiality taxonomy (entry 77) — the `class: blocking | advisory` field shape and "absent class reads as blocking" compatibility rule this phase mirrors onto R-SEM
  - [2026-07-31] the CONSUMERS registry for verdict-log readers (`scripts/efficiency.mjs`, `plugins/relay/scripts/usage-metrics.mjs`) — the mechanism new additive fields must register with
  - [2026-09-17] entries 96 and 97 — confirm R-SEM stays LLM judgment work (not moved to a deterministic script) and that a simplify pass is a separate, unimplemented concern; neither changes this phase's scope
- Applicable anti-patterns:
  - "Flipping `figma_track` (or any future opt-in gating key) by heuristic" — governs the new key's declared/default-off/never-inferred contract
  - "Injecting plugin defaults into the target project's `decisions.md`" — the new key's default lives in the plugin template and this project's own `methodology.md`, never written into `decisions.md`
  - "Writing pipeline artifacts under `.claude/`" — the baseline-cost artifact and every edit stay under `PRPs/` or `docs/`/`plugins/`
- Applicable architectural rules:
  - PRP artifact paths (`PRPs/reports/<feature>/` for the baseline-cost deliverable)
  - the orchestrator state machine's phase lifecycle (`plan-writer` back-fills row N to `in-progress` only; no other row is touched)
- Result: PROCEED
```

## Source

- `PRPs/prds/hybrid-code-review.prd.md` — Implementation Phases row 1:
  "Contract and opt-in" — Goal: make the hybrid expressible and
  measurable before anything dispatches it — Success signal: a
  verdict written with the key off is byte-identical in shape to
  today's; consumers parse a verdict written with the key on; the
  baseline number is recorded.

## Summary

This phase establishes the contract the rest of the `hybrid-code-review`
feature builds on, without dispatching anything. It adds a declared,
default-off `hybrid_code_review` opt-in key to `docs/context/methodology.md`
(both the plugin's per-project template in `context-builder`'s `SKILL.md`
and this repo's own dogfooded `methodology.md`), registers it
deterministically in `npm run validate`'s `gating-structure` check, adds a
schema slot for a `class: blocking | advisory` field on `code-reviewer`'s
R-SEM rubric row plus four additive verdict-log fields (`hyb`, `hyb_lvl`,
`hyb_n`, `hyb_ms`) documented in `code-reviewer.md` and registered in
`usage-metrics-schema.md`'s CONSUMERS contract, and records a documented
baseline of `code-reviewer`'s own current cost. No `/code-review` pass is
invoked anywhere in this phase, and no `rubric[]` shape changes for any
project that has not declared the key.

## User Story

As a relay operator preparing to opt a target project into the hybrid
code-review pass
I want the opt-in key, the rubric schema slot, and the verdict-log
CONSUMERS contract established up front
So that later phases (the pass itself, adjudication, the drift gate,
the dogfood) can build on a declared, measurable, never-inferred
foundation instead of improvising the schema as they go

## Problem Statement

Narrowed to this phase: before `code-reviewer` can safely gain a `Skill`
pass, there is no declared way for a project to opt in, no schema slot
on R-SEM for the advisory/blocking split the [2026-08-06] taxonomy
already models elsewhere, no registered verdict-log fields for the
pass's own metadata, and no recorded baseline for what `code-reviewer`
already costs — so "added cost" (a Phase 5 success metric) would have
no denominator, and the opt-in key would risk being invented ad hoc
inside a later phase instead of following the non-heuristic contract
every other gating key (`tdd`, `docs_sync`, `figma_track`,
`lane_runtime_safe`, `formatter_cmd`) already obeys.

## Solution Statement

Add `hybrid_code_review: false` to the `methodology.md` frontmatter
template (`SKILL.md`) and to this repo's own `methodology.md`, following
the exact emit/preserve/backfill prose shape `lane_runtime_safe`
established; register the key as a new `SITES` entry in
`scripts/validate/checks/gating-structure.mjs` so `npm run validate`
deterministically enforces the non-heuristic discipline; document a
`class` field slot on R-SEM in `code-reviewer.md` (mirroring
`plan-reviewer.md`'s materiality-classes shape, with the same
absent-reads-as-blocking compatibility rule) plus four additive,
closed-domain verdict-log fields; register those fields in
`usage-metrics-schema.md`'s CONSUMERS contract as an additive, no-version-bump
change; and record a documented, honestly-labeled baseline of
`code-reviewer`'s current cost in `PRPs/reports/hybrid-code-review/baseline-cost.md`.

## Metadata

| Key | Value |
|-----|-------|
| Type | Feature |
| Complexity | Medium |
| Systems Affected | `plugins/relay/skills/context-builder/SKILL.md`; `docs/context/methodology.md`; `scripts/validate/checks/gating-structure.mjs`; `plugins/relay/agents/code-reviewer.md`; `plugins/relay/resources/usage-metrics-schema.md`; `PRPs/reports/hybrid-code-review/` |
| Dependencies | none (first phase of `hybrid-code-review`) |
| Estimated Tasks | 6 |
| Source PRD line ref | `PRPs/prds/hybrid-code-review.prd.md:166-179` (Implementation Phases row 1 + Phase Details) |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `docs/context/methodology.md` | 1-108 | the exact opt-in key contract (emit/preserve/backfill) every new key must follow, including the two most recent worked examples (`lane_runtime_safe`, `formatter_cmd`) |
| P0 | `plugins/relay/skills/context-builder/SKILL.md` | 634-775 | the per-project template + Init/Update behavior prose Task 1 must mirror in shape and wording |
| P0 | `scripts/validate/checks/gating-structure.mjs` | 1-147 | the `SITES` registry Task 3 extends, including its `formatter_cmd`-exclusion boundary comment (lines 32-38) that decides whether a key belongs here at all |
| P0 | `plugins/relay/agents/code-reviewer.md` | 362-398, 892-1225 | the R-SEM row definition and the JSONL verdict schema Task 4 extends |
| P1 | `plugins/relay/resources/usage-metrics-schema.md` | 136-205 | the `verdict`/`rubric` relation contract and the existing `cls` column definition Task 5 extends |
| P1 | `docs/context/code-review-registries.md` | 42-49 | the silent-degradation precedent ("no registries declared; check skipped") an off/absent opt-in key should read like |
| P2 | `PRPs/reports/code-review-evaluation/report.md` | 105-109 | states plainly that no comparable cost number for `code-reviewer` exists today — the gap Task 6 closes |

## Patterns to Mirror

```
# SOURCE: plugins/relay/skills/context-builder/SKILL.md:681-686
- Always emit `docs_sync: true` — the per-project master switch for
  automated `docs/` knowledge-base sync defaults to `true`, mirroring
  the `tdd` default-emission precedent. Never heuristically inferred;
  always emitted deterministically on every `*init` run (`docs/decisions.md`,
  the entry on non-heuristic default-declared per-project methodology
  flags).
```
Copied by Task 1 (the emit/preserve/backfill prose shape for the new key).

```
# SOURCE: plugins/relay/skills/context-builder/SKILL.md:704-712
- Always emit `lane_runtime_safe: false` — the per-project declaration
  that this project's test stage does not contend on shared runtime
  resources (ports, container names, database namespaces), mirroring
  the `figma_track` default-emission precedent verbatim. Never
  heuristically inferred — no port scan, no `docker-compose` parse, no
  stack detection; always emitted deterministically on every `*init`
  run. Flips to `true` only via a human edit to this file — no command
  flips it.
```
Copied by Task 1 (Init behavior prose for a plain boolean opt-in key
with no companion secondary key — the exact shape `hybrid_code_review`
needs, since it is a boolean gate like `lane_runtime_safe`, not a
value-string key like `formatter_cmd`).

```
# SOURCE: plugins/relay/skills/context-builder/SKILL.md:759-767
- **`lane_runtime_safe` preservation**: if `lane_runtime_safe` is
  already present in the frontmatter, preserve its value untouched —
  validated human input, same treatment as `figma_track`. If the key
  is entirely absent (a project initialized before this key existed),
  backfill `lane_runtime_safe: false` — this is the ONLY case where
  `*update` adds this key; never remove or flip an existing value.
  Heuristics MUST NOT flip this value (no port scan, no
  `docker-compose` parse, no stack detection) — only a human edit can;
  no command flips it.
```
Copied by Task 1 (Update behavior prose).

```
# SOURCE: scripts/validate/checks/gating-structure.mjs:74-82
{
  key: 'lane_runtime_safe',
  markers: [
    { id: 'default-false-emission', pattern: /always emit `lane_runtime_safe: false`/i },
    { id: 'preserve-on-update', pattern: /`lane_runtime_safe`\s*preservation/i },
    { id: 'backfill-only-when-absent', pattern: /backfill\s*`lane_runtime_safe: false`/i },
  ],
},
```
Copied by Task 3 (the `SITES` entry shape — three marker regexes
matching Task 1's prose verbatim).

```
# SOURCE: plugins/relay/agents/code-reviewer.md:381-386
PASS iff no concerns. FAIL with a structured `findings[]` array of
`{file, line_or_range, concern, severity}`. Severity is
`{low, medium, high}`. ANY high-severity finding fails R-SEM
regardless of count; medium/low findings fail only when accumulated
above a project-tunable threshold (MVP: any medium finding fails;
low findings are advisory and do not fail).
```
Copied by Task 4 (the R-SEM row body the new `class` field slot is
appended to, without altering the existing pass/fail rule).

```
# SOURCE: plugins/relay/agents/code-reviewer.md:1115-1120
{ "id": "R-COH-DEAD-IMPORT", "passed": true },
{ "id": "R-COH-CALLER-DRIFT", "passed": true },
{ "id": "R-COH-CONFIG-DANGLING", "passed": true, "reason": "no config files in diff" },
{ "id": "R-COH-REGISTRY-MISSING", "passed": true, "reason": "no registries declared; check skipped" },
```
Copied by Task 4 (the additive-optional-field-on-a-row precedent —
`reason` appears only when relevant; `class` will follow the same
"present only when populated" discipline).

```
# SOURCE: plugins/relay/resources/usage-metrics-schema.md:190,194-205
| `cls` | `blocking` \| `advisory` | Materiality class. An absent `class` field on the source row is written as `blocking`. **Read this column per stage, never across stages** — see the caveat below. | yes |
...
**`cls` is only comparable within a stage.** The `class` field is emitted by
`plan-reviewer` alone. Measured against this repository's own corpus at the
time of writing: across 2184 rubric rows ... exactly zero carry a
`class` field.
```
Copied by Task 5 (the exact column this phase extends to a second
producer — `code-reviewer`'s R-SEM row — and the stale "emitted by
`plan-reviewer` alone" sentence Task 5 must update rather than leave
inaccurate).

```
# SOURCE: docs/context/code-review-registries.md:44-49
When `registries: []` (or this file is absent from
`<target_root>/docs/context/`), the `R-COH-REGISTRY-MISSING` check
degrades silently — emits a single `passed: true` row with reason
"no registries declared; check skipped". This matches the source
PRD's principle of silent degradation for projects without the
relevant context.
```
Copied by Task 4 (the same silent-degradation posture for the new
`class`/`hyb_*` fields when `hybrid_code_review` is off or absent —
they simply do not appear, never a placeholder or an error).

## Files to Change

| File | Action | Justification |
|------|--------|----------------|
| `plugins/relay/skills/context-builder/SKILL.md` | UPDATE | add `hybrid_code_review: false` to the `methodology.md` template frontmatter + Init/Update behavior prose (Task 1) |
| `docs/context/methodology.md` | UPDATE | backfill `hybrid_code_review: false` into this repo's own dogfooded config, mirroring the other declared keys already present (Task 2) |
| `scripts/validate/checks/gating-structure.mjs` | UPDATE | register `hybrid_code_review` as a new `SITES` entry so `npm run validate` enforces the non-heuristic contract (Task 3) |
| `plugins/relay/agents/code-reviewer.md` | UPDATE | document the `class` field slot on R-SEM and the four additive verdict-log fields (Task 4) |
| `plugins/relay/resources/usage-metrics-schema.md` | UPDATE | register the new additive `verdict`-relation columns and correct the "emitted by `plan-reviewer` alone" caveat (Task 5) |
| `PRPs/reports/hybrid-code-review/baseline-cost.md` | CREATE | record the Phase 1 baseline-cost deliverable (Task 6) |

## NOT Building (Scope Limits)

- No `/code-review` pass is dispatched anywhere in this phase (Phase 2's job).
- `Skill` is not added to `code-reviewer.md`'s `tools:` frontmatter yet (Phase 2).
- No advisory-by-default intake or reachability-confirmed promotion logic on R-SEM (Phase 3) — this phase only adds the `class` field's schema slot, not its adjudication rule.
- No drift gate or pinned-sample-set wiring (Phase 4).
- No target-project dogfood (Phase 5).
- No change to R-X, arbitration, the dispute channel, or `/relay-code-review` (explicit PRD exclusions).
- No support for `xhigh`, `max`, `ultra`, `--fix`, or `--comment` (refused by name in a later phase, not relevant until the pass exists).
- No `class` field on any rubric row other than R-SEM (explicit PRD MVP scope).

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/skills/context-builder/SKILL.md

- **ACTION**: In the `methodology.md` frontmatter template block (around
  line 641, immediately after `formatter_cmd`), add
  `hybrid_code_review: false  # true | false — opt-in switch for the hybrid /code-review evidence pass inside code-reviewer's R-SEM row; default off, never heuristically flipped`.
  Then add an "Always emit `hybrid_code_review: false`" bullet to the
  Init behavior list (after the `formatter_cmd` bullet, around line
  713-720) stating the key defaults off, mirrors the `lane_runtime_safe`
  default-emission precedent verbatim, and is never inferred from
  mentions of `/code-review` in a PRD, plan, or diff. Then add a
  "**`hybrid_code_review` preservation**" bullet to the Update behavior
  list (after the `formatter_cmd` bullet, around line 768-774) stating
  an already-present value is preserved untouched, and if the key is
  entirely absent, backfill `hybrid_code_review: false` — this is the
  ONLY case where `*update` adds this key; never remove or flip an
  existing value.
- **MIRROR**: `# SOURCE: plugins/relay/skills/context-builder/SKILL.md:704-712` (Init) and `# SOURCE: plugins/relay/skills/context-builder/SKILL.md:759-767` (Update)
- **AC**: AC-A1 (PRD AC-1), AC-A2 (PRD AC-2) — declares the default-off, never-heuristically-inferred contract the key must follow before anything can rely on it.
- **VALIDATE**: `if grep -q 'hybrid_code_review: false' plugins/relay/skills/context-builder/SKILL.md && grep -q 'Always emit \`hybrid_code_review: false\`' plugins/relay/skills/context-builder/SKILL.md && grep -q '\`hybrid_code_review\` preservation' plugins/relay/skills/context-builder/SKILL.md && grep -q 'backfill \`hybrid_code_review: false\`' plugins/relay/skills/context-builder/SKILL.md; then echo "PASS: hybrid_code_review markers present in SKILL.md"; else echo "FAIL: one or more hybrid_code_review markers missing"; exit 1; fi`

### Task 2: UPDATE docs/context/methodology.md

- **ACTION**: Add `hybrid_code_review: false` to this repo's own
  frontmatter block (after `formatter_cmd: null`), and add a
  "## Hybrid Code Review" prose section below "## Formatter" following
  the exact shape of the existing "## Formatter" section (Current
  state / How to override), stating the key is declared off, is
  consumed starting Phase 2 of `hybrid-code-review`, and is never
  heuristically flipped.
- **MIRROR**: `# SOURCE: docs/context/methodology.md:80-101` (the "## Formatter" section's Current-state / How-to-override shape, the newest key in this file before this task)
- **AC**: AC-A1 (PRD AC-1), AC-A2 (PRD AC-2) — this repo's own dogfooded config declares the key off, matching the default-off, never-inferred contract.
- **VALIDATE**: `grep -q '^hybrid_code_review: false' docs/context/methodology.md`

### Task 3: UPDATE scripts/validate/checks/gating-structure.mjs

- **ACTION**: Append a new entry to the `SITES` array (after the
  `lane_runtime_safe` entry) for `key: 'hybrid_code_review'` with
  three markers whose regex patterns match the exact prose Task 1
  added to `SKILL.md`: `default-false-emission` matching
  `/always emit \`hybrid_code_review: false\`/i`,
  `preserve-on-update` matching
  `` /`hybrid_code_review`\s*preservation/i ``, and
  `backfill-only-when-absent` matching
  `` /backfill\s*`hybrid_code_review: false`/i ``.
- **MIRROR**: `# SOURCE: scripts/validate/checks/gating-structure.mjs:74-82`
- **AC**: AC-A2 (PRD AC-2) — this is the mechanism that deterministically enforces the key's declared/default-off/never-inferred contract via `npm run validate`.
- **VALIDATE**: `node -e "import('./scripts/validate/checks/gating-structure.mjs').then(async m => { const fs = await import('node:fs'); const content = fs.readFileSync('plugins/relay/skills/context-builder/SKILL.md','utf-8'); const r = m.checkGatingStructure({skillContent: content}); if (!r.ok) { console.error('FAIL:', JSON.stringify(r.findings)); process.exit(1); } console.log('PASS: gating-structure recognizes hybrid_code_review'); })"`

### Task 4: UPDATE plugins/relay/agents/code-reviewer.md

- **ACTION**: In the R-SEM section (after the existing severity rule,
  around line 386), add: "R-SEM's row MAY additionally carry a
  `class: blocking | advisory` field once `docs/context/methodology.md`
  declares `hybrid_code_review: true` and a later phase populates the
  value (Phase 3 of `hybrid-code-review`); an absent `class` field
  reads as `blocking`, matching `plan-reviewer.md`'s own compatibility
  rule. This phase documents the slot only — no code in this repo yet
  sets `class` on R-SEM." In the `code-review.jsonl format` section's
  Step 4.1 verdict-object schema (around line 894-909) and both
  worked examples (APPROVED around line 1098-1125, CHANGES_REQUESTED
  around line 1127-1148), document four new OPTIONAL top-level verdict
  fields, present only when `hybrid_code_review: true` and a pass ran
  (absent — not `-` — otherwise, since this phase never sets them):
  `"hyb": 0 | 1` (whether a `/code-review` pass was invoked this
  verdict), `"hyb_lvl": "medium" | "high" | "-"` (the configured
  level), `"hyb_n": <non-negative integer> | "-"` (findings the pass
  returned), `"hyb_ms": <non-negative integer> | "-"` (the pass's own
  wall-clock duration). State explicitly these four fields are
  additive-only per the `usage-metrics-schema.md` versioning rule (no
  version bump, appended at the end of the row) and that no field in
  this repo is populated until Phase 2 exists.
- **MIRROR**: `# SOURCE: plugins/relay/agents/code-reviewer.md:381-386` (R-SEM body) and `# SOURCE: plugins/relay/agents/code-reviewer.md:1115-1120` (additive optional-field precedent)
- **AC**: AC-A1 (PRD AC-1), AC-A3 (PRD AC-8) — documents the `class` slot behind the absent-reads-as-blocking rule and the four additive fields' closed-domain shape, both unpopulated so today's verdict shape stays byte-identical.
- **VALIDATE**: `if grep -q '\`class: blocking | advisory\`' plugins/relay/agents/code-reviewer.md && grep -q 'hyb_lvl' plugins/relay/agents/code-reviewer.md && grep -q 'hyb_ms' plugins/relay/agents/code-reviewer.md; then echo "PASS: R-SEM class slot and hyb_* fields documented"; else echo "FAIL: R-SEM class slot or hyb_* fields missing"; exit 1; fi`

### Task 5: UPDATE plugins/relay/resources/usage-metrics-schema.md

- **ACTION**: In the `## Relation: verdict` field-semantics table
  (around line 143-165), add four new rows for `hyb`, `hyb_lvl`,
  `hyb_n`, `hyb_ms` with domains matching Task 4's field shapes
  exactly (`0` \| `1`; code \| `-`; non-negative integer \| `-`;
  non-negative integer \| `-`), each marked non-contractual (`no`),
  and a one-line note that they are populated only once `code-reviewer`
  emits them (Phase 2+ of `hybrid-code-review`) — absent on every row
  materialized before then, per the file's own "Duration is recorded
  where it exists and absent elsewhere — never zero" rule. In the
  `## Relation: rubric` section's `cls` caveat (around line 194-205),
  correct "The `class` field is emitted by `plan-reviewer` alone" to
  state it is also documented (schema-only, not yet populated) on
  `code-reviewer`'s R-SEM row as of this phase, and that the "exactly
  zero carry a `class` field" count is scoped to `code-review.jsonl`
  and `test-write-review.jsonl` as they stand at the time of writing —
  still accurate today, since this phase adds no code that sets the
  value.
- **MIRROR**: `# SOURCE: plugins/relay/resources/usage-metrics-schema.md:190,194-205`
- **AC**: AC-A3 (PRD AC-8) — registers the four additive fields in the CONSUMERS contract so existing consumers keep parsing every line without error.
- **VALIDATE**: `if grep -q 'hyb_lvl' plugins/relay/resources/usage-metrics-schema.md && grep -q 'hyb_ms' plugins/relay/resources/usage-metrics-schema.md; then echo "PASS: verdict relation documents hyb_* columns"; else echo "FAIL: hyb_* columns not documented in usage-metrics-schema.md"; exit 1; fi`

### Task 6: CREATE PRPs/reports/hybrid-code-review/baseline-cost.md

- **ACTION**: Create the directory and file recording a documented
  baseline for `code-reviewer`'s own current cost, honestly scoped to
  what is actually measurable today. `code-review.jsonl` carries no
  token or duration field (confirmed by
  `PRPs/reports/code-review-evaluation/report.md:105-109`: "relay's
  reviewer: no comparable number exists... Measuring it is a
  precondition for the PRD's cost gate"), so this task computes a
  structural proxy instead of fabricating a token/wall-time number:
  for every `PRPs/plans/*.code-review.jsonl` file, count total
  verdict lines and the min/median/max `rubric[]` row count per
  verdict (the array `code-reviewer.md` itself documents as "14 to 20
  rows" per standard-mode run). Write the counts, the proxy's explicit
  label ("structural proxy — NOT a token or wall-time measurement"),
  and a one-line statement that true per-invocation cost remains
  unmeasured and is expected to be closed by direct instrumentation in
  a later phase, into `PRPs/reports/hybrid-code-review/baseline-cost.md`.
- **MIRROR**: `# SOURCE: plugins/relay/resources/usage-metrics-schema.md:242-247` (the "Duration is recorded where it exists and absent elsewhere — never zero" honesty norm this task's explicit labeling follows)
- **AC**: Infrastructure/scaffolding — no PRD `AC-N` maps directly to this task; it delivers the Phase 1 Scope item "the baseline cost measurement" and closes the gap the PRD's Success Metrics section names explicitly: "The baseline cost of `code-reviewer` without the pass is a Phase 1 deliverable rather than a success metric, so it is recorded there and not listed here."
- **VALIDATE**: `node -e "
const fs = require('node:fs');
const dir = 'PRPs/plans';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.code-review.jsonl'));
let total = 0; const counts = [];
for (const f of files) {
  for (const line of fs.readFileSync(dir + '/' + f, 'utf-8').split('\n')) {
    if (!line.trim()) continue;
    let j; try { j = JSON.parse(line); } catch { continue; }
    total++;
    if (Array.isArray(j.rubric)) counts.push(j.rubric.length);
  }
}
if (total === 0) { console.error('FAIL: no code-review.jsonl verdicts found to baseline'); process.exit(1); }
if (!fs.existsSync('PRPs/reports/hybrid-code-review/baseline-cost.md')) { console.error('FAIL: baseline-cost.md missing'); process.exit(1); }
const body = fs.readFileSync('PRPs/reports/hybrid-code-review/baseline-cost.md', 'utf-8');
if (!/structural proxy/i.test(body)) { console.error('FAIL: baseline-cost.md missing the required proxy label'); process.exit(1); }
console.log('PASS: baseline recorded over', total, 'verdicts,', files.length, 'files');
"`

## Validation Commands

**Level 1 STATIC_ANALYSIS**

```
npm run validate
```

Runs the full 24-check `scripts/validate/index.mjs` suite, including
the extended `gating-structure` check from Task 3. Exits non-zero if
any check fails (real tool exit code, no wrapping).

**Level 2 CONTENT_INVARIANTS**

```
set -euo pipefail
grep -q 'hybrid_code_review: false' plugins/relay/skills/context-builder/SKILL.md
grep -q 'Always emit `hybrid_code_review: false`' plugins/relay/skills/context-builder/SKILL.md
grep -q '`hybrid_code_review` preservation' plugins/relay/skills/context-builder/SKILL.md
grep -q 'backfill `hybrid_code_review: false`' plugins/relay/skills/context-builder/SKILL.md
grep -q '^hybrid_code_review: false' docs/context/methodology.md
grep -q "key: 'hybrid_code_review'" scripts/validate/checks/gating-structure.mjs
grep -q 'class: blocking | advisory' plugins/relay/agents/code-reviewer.md
grep -q 'hyb_lvl' plugins/relay/agents/code-reviewer.md
grep -q 'hyb_lvl' plugins/relay/resources/usage-metrics-schema.md
test -f PRPs/reports/hybrid-code-review/baseline-cost.md
echo "PASS: all Phase 1 contract markers present"
```

`set -euo pipefail` makes any single failing `grep -q` or `test -f`
abort the whole block with a non-zero exit before the final `echo`
runs — this is not the `&& echo PASS || echo FAIL` idiom that always
exits 0.

**Level 3 DRY-RUN END-TO-END**

```
node --test "scripts/validate/**/*.test.mjs"
```

Re-runs the existing `node:test` corpus (including
`scripts/validate/checks/gating-structure.test.mjs`) to confirm the
Task 3 registry edit did not break any existing check's tests. Exits
non-zero on any test failure (the glob form, per the documented
`node --test <dir>` `MODULE_NOT_FOUND` gotcha).

## Acceptance Criteria

- **AC-A1 (PRD AC-1):** Given a target project whose
  `docs/context/methodology.md` does not declare `hybrid_code_review`
  (or declares it `false`), the key's presence in the template and in
  this repo's own config defaults to off and adds no field to any
  emitted `rubric[]` — the schema slots this phase documents (`class`
  on R-SEM, `hyb`/`hyb_lvl`/`hyb_n`/`hyb_ms` on the verdict object)
  stay entirely unpopulated, so a verdict written today is
  byte-identical in shape to one written before this phase.
- **AC-A2 (PRD AC-2):** The `hybrid_code_review` key is declared,
  never inferred — enforced deterministically by the new
  `gating-structure` `SITES` entry (Task 3), which fails
  `npm run validate` if the key's emit/preserve/backfill discipline is
  ever undocumented, mirroring how `figma_track`'s own non-heuristic
  contract is enforced.
- **AC-A3 (PRD AC-8):** The four new additive verdict-log fields
  (`hyb`, `hyb_lvl`, `hyb_n`, `hyb_ms`) are each a code, a
  non-negative integer, or the `-` sentinel — no free-text column is
  introduced — and are registered in `usage-metrics-schema.md`'s
  CONSUMERS contract as an additive, no-version-bump change, so
  `usage-metrics.mjs` and `scripts/efficiency.mjs` continue to parse
  every line without error once a later phase starts populating them.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| The new `class` field slot on R-SEM, once Phase 3 wires real values, misreads historic rows written before this phase | L | M | The absent-`class`-reads-as-`blocking` compatibility rule is preserved verbatim (`usage-metrics-schema.md`); this phase only documents the schema slot and sets no value anywhere |
| The baseline-cost structural proxy (rubric-row-count distribution) is mistaken for a real token/wall-time measurement | M | L | Task 6's report explicitly labels the number "structural proxy — NOT a token or wall-time measurement" and states true per-invocation cost remains unmeasured, per the corpus's own "never zero, never fabricated" honesty norm |
| The `gating-structure.mjs` `SITES` regex markers drift from the actual `SKILL.md` prose wording, silently breaking `npm run validate` for this key | L | M | Task 3's VALIDATE exercises the real `checkGatingStructure` function against the real `SKILL.md` content (not a text match), and Level 1/3 Validation Commands re-run `npm run validate` and the existing `gating-structure.test.mjs` suite after the change |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of
`tdd` in `docs/context/methodology.md`: **false**. Test-after
ordering — when a test framework is declared, the test pair
(test-writer/test-reviewer) authors and maintains the suite from the
Acceptance Criteria above, after the Implementer + Code Review; with
no framework declared, no tests are authored.

**Test-file routing:** this phase's test-file creation and updates are
routed through the `test-writer`/`test-reviewer` pair's lifecycle
ledger (`/relay-write-test` → `/relay-test-write-review`), not authored
by the Implementer — R-X is a blanket straight-fail on any test glob in
the Implementer's diff. No task above and no `## Files to Change` row
targets a test file (`scripts/validate/checks/gating-structure.test.mjs`
is read by Level 3 but never edited by any task), so this plan's
`**VALIDATE**` commands exercise the change directly rather than
invoking the test framework for new coverage.

**On the `hybrid_code_review` key name:** the source PRD never fixes a
literal key name — only "the `methodology.md` key" (Phase 1 scope) and
"an opt-in `methodology.md` key" (Open Questions). `hybrid_code_review`
is chosen here for clarity and consistency with the feature slug; a
future phase or a human editor may rename it before the key is ever
consumed by real dispatch logic (Phase 2), since nothing outside this
phase's own documentation reads the name yet.

**Baseline-cost gap acknowledged, not solved.** `report.md` §3.2 is
explicit that `code-reviewer`'s true token/wall-time cost is
unrecorded and "a precondition for the PRD's cost gate." This phase
closes the PRD's literal Phase 1 deliverable ("a recorded baseline of
the reviewer's own cost") with the best available proxy rather than
inventing instrumentation out of scope for this phase; direct
per-invocation cost instrumentation, if pursued, belongs to a later
phase and is not implied by anything in this plan.

*Generated: 2026-09-23*
*Approved: 2026-09-23*
*Status: IMPLEMENTED*
