# Feature: Implement-time gate (Phase 5 of figma-visual-first-track)

```
**Decision Gate**
- Active context: none
- Activated criteria: architectural decisions; cross-cutting artifact creation (one command prompt, one agent prompt, one real executable script); reuse or creation of components; a deliberate, PRD-authorized amendment of a previously-shipped non-blocking guarantee; a new halt-outcome vocabulary that is the first structural step toward Phase 6's (recorded, not-yet-built) interactivity-boundary extension
- Decisions found:
  - [2026-07-23] Visual-verification loop: bounded, non-blocking degradation ladder inside /relay-implement (Figma Implementation Track Phase 6) — the exact mechanism this phase amends; today's "every branch proceeds to Phase A.3.5 without halting" guarantee is deliberately narrowed to non-visual-scoped plans only, per this PRD's own AC-4
  - [2026-07-25] `phase_scope` non-heuristic sourcing + `R-COH-VISUAL-SCOPE-PURITY` enforcement (Figma Visual-First Track Phase 3) — the Metadata field this phase's new `relay-implement.md` read consumes verbatim, never inferred
  - [2026-07-25] `phase_scope: logic` sentinel-ledger resolution (Figma Visual-First Track Phase 4) — confirms Phase 5 (this phase) and Phase 6 are the two remaining phases of the track
  - [2026-04-19] Interactivity boundary: PRD interactive, downstream autonomous — this phase does NOT itself cross the boundary (no dialogue added); it only introduces the halt vocabulary Phase 6's HALT-and-resume mechanism will later consume
  - [2026-05-01] D6 — source PRD's Implementation Phases table IS the state machine — row 5's `Depends` cell (`4`) confirms Phase 4 is the satisfied prerequisite
  - [2026-07-09] Validation commands must carry real exit-code semantics; `plan-reviewer` enforces via `R-COH-VALIDATE-ALWAYS-PASS` — binding on every VALIDATE/Level command this plan emits
  - [2026-07-12] Validation suite: relay repo declares `test_frameworks: ["node:test"]` (`tdd: false`, test-after, active pair) — binding on this phase's `phase_type` classification and VALIDATE-command shaping, since `capture.mjs` is this track's first real `.mjs` application-code surface
  - [2026-05-14] `phase_type` Metadata-field precedent (self-healing, reviewer may infer/insert) — the classification this phase's Metadata table must set accurately (see Metadata section for the `feature`-not-`scaffold` reasoning)
- Applicable anti-patterns:
  - "Flipping `figma_track` (or any future opt-in gating key) by heuristic" — generalizes to `phase_scope` and `visual_first_approval`: both read verbatim from the plan's Metadata / `docs/context/methodology.md`, never inferred from row content or task prose
  - "Writing pipeline artifacts under `.claude/`" — every write in this phase lands under `plugins/relay/commands/`, `plugins/relay/agents/`, `plugins/relay/scripts/visual/`, or `documentation/`, never `.claude/`
  - "Relying on interactive permission prompts in the autonomous loop" — the new `AWAITING_VISUAL_APPROVAL` halt is a structured, non-interactive exit (the command HALTs and returns control; it does not block on a live prompt)
- Applicable architectural rules:
  - Interactivity boundary is fixed at PRD approval; this phase adds no dialogue of its own — it only prepares the halt vocabulary Phase 6's (already-recorded, PRD-authorized) third interactivity-boundary extension will consume
  - Pillar 2 "never commit" invariant (2026-05-18) — the new halts perform no commit, mirroring Phase A.3.4's existing "No commit issued" guarantee verbatim
  - `visual-verifier` and `plugins/relay/scripts/visual/*` are reused with only additive, backward-compatible extensions (this PRD's Architecture Notes) — `compare.mjs`/`provision.mjs` stay untouched; the blocking-vs-non-blocking routing changes only in the calling command (`relay-implement.md`)
  - `PRPs/` artifact convention; one command per stage with writer/reviewer split
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/figma-visual-first-track.prd.md` — Implementation Phases row 5:
  "Implement-time gate" — Goal: Phase A.3.4 blocks a visual-scoped phase
  on anything short of `VISUAL_VERIFIED`/human approval, while leaving
  the logic-scoped regression behavior byte-identical to today. —
  Success signal: A visual-scoped dry run halts correctly on a
  deliberate mismatch; a logic-scoped dry run reproduces today's exact
  non-blocking behavior.

## Summary

This phase makes `/relay-implement`'s `Phase A.3.4` dual-mode and gives
`capture.mjs` its first real behavioral extension since Phase 6 of the
base Figma Implementation Track created it. Three files change: (1)
`plugins/relay/scripts/visual/capture.mjs` gains a bounded
click/fill/wait interaction-step parser and executor, wired additively
between `page.goto` and `page.screenshot` inside `captureFrame` — a
frame with no `interaction` (or `"none"`) behaves byte-identically to
today; (2) `plugins/relay/agents/visual-verifier.md`'s Step 0
frame-manifest construction passes the Design Spec's 9th `Interaction`
column (registered in Phase 1) through to that manifest; (3)
`plugins/relay/commands/relay-implement.md`'s `Phase A.3.4` reads the
plan's `phase_scope` (sourced non-heuristically by Phase 3) and the
target project's `visual_first_approval` (`auto`/`human`, read
non-heuristically from `docs/context/methodology.md`, defaulting to
`auto` only when the key is entirely absent — never inferred), then
routes its EXISTING verdict-reaching mechanics (dispatch, fix-round
retry, deterministic revert — all unchanged) to one of two new named
HALT outcomes (`AWAITING_VISUAL_APPROVAL`, `VISUAL_GATE_BLOCKED`) when
`phase_scope: visual`, while leaving every other plan's behavior
(`phase_scope` absent, or `phase_scope: logic`) exactly as it is today.
`compare.mjs` and `provision.mjs` are untouched. This is the largest
phase of the track and the first v2 phase whose deliverable is
genuinely mixed — two prompt/markdown files and one real executable
script — which drives this plan's `phase_type: feature` classification
(see Metadata) and its `node`-first-token VALIDATE-command shaping.

## User Story

```
As a developer using relay's Figma Visual-First Track
I want /relay-implement's visual gate to genuinely block a visual-scoped
phase from completing until it is truly verified (or a human explicitly
approves it), while leaving every non-visual phase's regression exactly
as non-blocking as it is today, and to have interaction-triggered states
captured deterministically before the pixel diff
So that the mechanism this track was built for — catching a wrong
visual before any logic exists on top of it — is actually enforced at
implement time, not merely modeled in the plan-authoring layer
```

## Problem Statement

Today, `/relay-implement`'s `Phase A.3.4` always treats visual
verification as non-blocking, regardless of whether the phase being
implemented is a mocked, logic-free visual phase or a real-data logic
phase — so even with the Visual-First Track's strict phase pairing
already shipped (Phases 1-4), a visual-scoped phase's wrong visual can
still reach `complete` and unlock its paired logic phase without ever
being blocked on a genuine `VISUAL_VERIFIED` result or an explicit
human sign-off, defeating the mechanism this track exists to deliver
(source PRD AC-4). Separately, interaction-triggered visual states
(menus, toasts, spinners) declared via the Design Spec's `Interaction`
column (registered in Phase 1) are not yet executed anywhere in the
pipeline — `capture.mjs` takes only a static screenshot immediately
after page load, so a frame whose fidelity depends on a prior
click/fill/wait sequence cannot yet be captured deterministically.

## Solution Statement

Make `Phase A.3.4` dual-mode by reading the plan's `phase_scope`
(sourced non-heuristically by Phase 3, sentinel-resolved by Phase 4)
and the target project's `visual_first_approval` methodology key: on
`phase_scope: visual`, gate phase completion on a genuine
`VISUAL_VERIFIED` result (`auto` mode) or explicit human review
(`human` mode) via two new named HALT outcomes that skip Phase A.3.5
and Phase A.4 (D8) entirely; on anything else (absent `phase_scope`, or
`phase_scope: logic`), preserve today's non-blocking behavior
byte-for-byte. Reuse the existing dispatch/retry/revert mechanics
inside `Phase A.3.4` verbatim — only the terminal routing changes.
Separately, give `capture.mjs` an additive interaction-step executor
(bounded click/fill/wait vocabulary, per Phase 1's own syntax) wired
between `page.goto` and `page.screenshot`, and give
`visual-verifier.md` the small manifest-passthrough edit that feeds
it — both zero-effect for any frame that declares no `Interaction`
script.

## Metadata

| Field | Value |
|---|---|
| Type | Feature — dual-mode implement-time visual gate (blocking/non-blocking routing) + additive interaction-step execution in a real script |
| Complexity | High — largest phase of the track; the first v2 phase to touch real executable code (`capture.mjs`) rather than only markdown agent/template files |
| Systems Affected | `plugins/relay/commands/relay-implement.md`, `plugins/relay/agents/visual-verifier.md`, `plugins/relay/scripts/visual/capture.mjs`, `documentation/changelog.html` |
| Dependencies | Phase 4 (Plan authoring — logic phase + sentinel ledger) — complete; ships the `phase_scope` sourcing mechanism this phase's `relay-implement.md` read consumes |
| Estimated Tasks | 7 |
| Source PRD line ref | `PRPs/prds/figma-visual-first-track.prd.md` Implementation Phases row 5 |
| phase_type | feature |

**On `phase_type: feature` (not `scaffold`, not `foundation`):** this
phase's own precedent set gives three cleanly-discriminating data
points, all confirmed in this repo's shipped history. (1) Phases 1-4 of
THIS track chose `scaffold` because their entire deliverable was
prompt/template markdown with no `.mjs` surface at all — "no
test-framework invocation is the natural validation mechanism" was
literally true. (2) `PRPs/plans/completed/figma-implementation-track-phase-6-visual-loop.plan.md`
(the plan that CREATED `capture.mjs`/`provision.mjs`/`compare.mjs` from
scratch) chose `phase_type: foundation` because it created an entirely
new subsystem later phases (including this one) depend on as a seam —
its VALIDATE commands are `node --check` "compile/build" checks, the
foundation exemption's own defining shape. (3)
`PRPs/plans/completed/validation-suite-phase-2-static-checks.plan.md`
explicitly chose `phase_type: feature` — NOT `scaffold` — for new
`.mjs` modules with "real detection logic," stating verbatim: "the
framework-mismatch exemption does not apply — Level-2 unit coverage of
each checker is genuinely test-first-able and is delivered test-after
by the pair." Phase 5 (this phase) does not create a new seam
(`capture.mjs` already exists; this phase extends it with a real,
testable capability — a click/fill/wait interpreter) and its
deliverable is not markdown-only (unlike Phases 1-4). It lands squarely
in bucket (3): `phase_type: feature`. Per `R-COH-VALIDATE-FRAMEWORK-MISMATCH`,
this means every per-task `VALIDATE` command's first token must match
(or be a recognized invocation pattern of) the declared `node:test`
framework — satisfied here by using `node --check` / `node -e` for
every task (never `grep`-first), mirroring `validation-suite-phase-2`'s
own idiom verbatim (its Task 1 VALIDATE uses `node -e` even to check
`package.json`, a non-`.mjs` file) rather than inventing a new pattern.

This target project's own `docs/context/methodology.md` does not
declare `figma_track: true`, so per `docs/context/plan-template.md`'s
dual-branch rule this table carries no `design_source` row and the
plan body carries no `## Design Source` section. This plan's own
source PRD (`figma-visual-first-track.prd.md`) does not declare
`visual_first: true` either — it is the PRD that BUILDS the
visual-first mechanism, not one that USES it; row 5's own `Phase` cell
("Implement-time gate") carries no `[VISUAL]`/`[LOGIC]` tag — so this
table also carries no `phase_scope` row, consistent with Phases 1-4's
own self-application notes. The new dual-mode machinery this phase
ships is inert against this repo and against this very plan, by
design.

## Mandatory Reading

| Priority | Path | Lines | Why |
|---|---|---|---|
| P0 | `plugins/relay/commands/relay-implement.md` | 368-397 | The current, always-non-blocking `Phase A.3.4` — the exact section this phase restructures into dual-mode |
| P0 | `plugins/relay/commands/relay-implement.md` | 203-220 | `Phase A.0`'s existing default-when-absent read idiom for `docs_sync`/`figma_track`/`design_source` — the exact pattern the new `phase_scope`/`visual_first_approval` read mirrors |
| P0 | `plugins/relay/commands/relay-implement.md` | 222-266 | `Phase A.1`'s halt.json + verbatim-blockquote-HALT idiom (e.g. `FAILED_TIME_BUDGET_EXCEEDED`) — the exact shape the two new named halts (`AWAITING_VISUAL_APPROVAL`, `VISUAL_GATE_BLOCKED`) mirror |
| P0 | `plugins/relay/agents/visual-verifier.md` | 96-101 | `Step 0`'s frame-manifest construction — the exact object literal extended with `interaction` |
| P0 | `plugins/relay/scripts/visual/capture.mjs` | 39-77 | `parseAuthMode`/`frameFilename`/`captureFrame` — the insertion point (`page.goto` at line 64, `page.screenshot` at line 66) and the existing "no export unless needed for testability" convention |
| P0 | `docs/context/design-spec-template.md` | 107-113 | The 9th `Interaction` column's exact bounded vocabulary syntax (`click(<selector>)`, `fill(<selector>, <value>)`, `wait(<ms> \| <selector>)`, semicolon-separated, `"none"` default) `capture.mjs`'s new parser must implement precisely |
| P1 | `PRPs/prds/figma-visual-first-track.prd.md` | 132, 206 | Architecture Notes' human-gate-mechanism paragraph + the Decisions Log "Human-gate mechanism" row — rules out a synchronous dialogue, mandates the HALT-and-resume shape this phase's two new outcomes prepare for |
| P1 | `docs/decisions.md` | 789-803 | `[2026-07-23]` Visual-verification loop entry — the exact non-blocking mechanism this phase deliberately narrows to non-visual-scoped plans only |
| P1 | `docs/decisions.md` | 848-861 | `[2026-07-25]` `phase_scope` non-heuristic sourcing entry (Phase 3) — the lineage this phase's `relay-implement.md` read must mirror (read verbatim from the plan's own Metadata, never inferred) |
| P2 | `PRPs/plans/completed/figma-implementation-track-phase-6-visual-loop.plan.md` | 58-60, 175-195 | `phase_type: foundation`'s own reclassification + reasoning paragraph (58-60) — the contrast this plan's own `feature` choice (Metadata section) argues against; Tasks 2-4's `node --check` VALIDATE idiom (lines 175, 185, 195) this plan's own per-task VALIDATE commands mirror |
| P2 | `PRPs/plans/completed/validation-suite-phase-2-static-checks.plan.md` | 59-61, 200 | `phase_type: feature`'s own declaration + reasoning blockquote (59-61: "these are behavioral consistency checks with real detection logic... framework-mismatch exemption does not apply") — the direct precedent this plan's own `feature` classification and `node`-first-token VALIDATE shaping follow; line 200 confirms the Implementer authors zero test files under this classification, the same test-after discipline this plan's own Notes section states |
| P2 | `PRPs/prds/figma-visual-first-track.prd.md` | 180-183 | Phase 5's own Goal / Scope / Success-signal Phase Details block |

## Patterns to Mirror

```
# SOURCE: plugins/relay/commands/relay-implement.md:216-218
Read `<target_root>/docs/context/methodology.md` frontmatter and extract the `docs_sync` key, recording `docs_sync_enabled` (boolean). Default `true` when the key is absent, mirroring the `tdd` absence-handling precedent...

Also read the same `docs/context/methodology.md` frontmatter for the `figma_track` key, recording `figma_track_declared = (figma_track == true)` (boolean; default `false` when the key is absent...). Then `Read` the plan at `<plan_path>` and check its `## Metadata` table's `design_source` row...
```
Copied into Task 4 as the exact default-when-absent idiom for reading a
methodology.md key (`visual_first_approval`) combined with a plan
Metadata field (`phase_scope`) — the two-source-combination shape is
structurally identical to the existing `figma_track` + `design_source`
combination.

```
# SOURCE: plugins/relay/commands/relay-implement.md:226-233
1. **Time budget check.** If `now() >= deadline_ts`:
   - Write `<artifact_root>../halt.json` (i.e. `PRPs/reports/<feature>/phase-<N>/halt.json` in PRD mode...) with `{outcome: "FAILED_TIME_BUDGET_EXCEEDED", attempts_completed: <attempt-1>, deadline_ts, elapsed_minutes, remaining_retries: <max_implement_retries + 1 - attempt>, attempt_history: [...], dispute_history: [...], actionable_recommendation: "..."}`.
   - HALT with verbatim message:
     > FAILED_TIME_BUDGET_EXCEEDED. /relay-implement aborted after
     > <elapsed_minutes> wall-clock minutes (max_implement_minutes=45)
     > with <max_implement_retries + 1 - attempt> retries unused.
     > Per-attempt diffs preserved at <artifact_root>. Halt state at
     > <artifact_root>../halt.json.
```
Copied into Task 5 as the exact `halt.json` shape + verbatim-blockquote
idiom the two new outcomes (`AWAITING_VISUAL_APPROVAL`,
`VISUAL_GATE_BLOCKED`) follow.

```
# SOURCE: plugins/relay/agents/visual-verifier.md:100
Build the in-memory frame manifest: one entry per Visual Acceptance Criteria row — `{node_id, route, preconditions, auth_mode, viewport: {width, height}, diff_threshold, ref_png, masks}`.
```
Copied into Task 3 as the exact object-literal sentence extended with
`, interaction}` — kept on the same single physical line as the
original (the source line is already one contiguous markdown line;
this phase's edit preserves that so the VALIDATE grep target stays
contiguous).

```
# SOURCE: plugins/relay/scripts/visual/capture.mjs:61-66
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  try {
    await page.goto(frame.route, { waitUntil: 'networkidle' });
    const outputPath = path.join(outputDir, frameFilename(frame.node_id));
    await page.screenshot({ path: outputPath, fullPage: false });
```
Copied into Task 2 as the exact insertion point — the new
`executeInteractionSteps(page, steps)` call goes between the `goto`
line and the `screenshot` line, additive and conditional on a non-empty
parsed step list.

```
# SOURCE: docs/context/design-spec-template.md:113
{optional ordered interaction script — semicolon-separated steps from the bounded vocabulary click(<selector>), fill(<selector>, <value>), wait(<ms> \| <selector>), executed in order before capture; or "none"}
```
Copied into Task 1 as the literal bounded vocabulary `parseInteractionScript` implements: exactly three verbs (`click`, `fill`, `wait`), semicolon-separated, `"none"`/absent → zero steps.

```
# SOURCE: PRPs/plans/completed/validation-suite-phase-2-static-checks.plan.md:213
node -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync('package.json','utf8')); const d=p.devDependencies||{}; if(!d.ajv||!d['node-html-parser']){console.error('FAIL: devDependencies missing ajv and/or node-html-parser'); process.exit(1);} ... console.log('PASS: ...');"
```
Copied into every task below as the canonical `node -e` content-check
idiom — first token `node` (satisfying `R-COH-VALIDATE-FRAMEWORK-MISMATCH`
under `phase_type: feature`), explicit `process.exit(1)` on failure
(satisfying `R-COH-VALIDATE-ALWAYS-PASS`), never a bare
`grep`-first-token command in this plan's per-task VALIDATE lines.

## Files to Change

| File | Action | Justification |
|---|---|---|
| `plugins/relay/scripts/visual/capture.mjs` | UPDATE | Adds `parseInteractionScript`/`executeInteractionSteps` (bounded click/fill/wait vocabulary) and wires execution between `page.goto` and `page.screenshot` in `captureFrame` — additive, zero-effect when a frame's `interaction` is absent/`"none"` |
| `plugins/relay/agents/visual-verifier.md` | UPDATE | Step 0 frame-manifest construction passes through the Design Spec's 9th `Interaction` column (added by Phase 1) as `interaction`, defaulting to `"none"` when the column/cell is absent |
| `plugins/relay/commands/relay-implement.md` | UPDATE | `Phase A.3.4` reads `phase_scope`/`visual_first_approval` and becomes dual-mode: two new named halts on `phase_scope: visual`, byte-identical non-blocking behavior on everything else; the two new halts are registered in the `## Final output surface` HALT enumeration and `## Constraints` |
| `documentation/changelog.html` | UPDATE | `Unreleased` → `Added` entry for this phase |

## NOT Building (Scope Limits)

- Mixed visual+logic phases, N:1 phase pairing, retrofitting existing
  PRDs, or any heuristic inference of `visual_first`/`phase_scope`/
  `visual_first_approval` — inherited PRD-level exclusions; already
  enforced by Phases 2-4's reviewers, not re-litigated here.
- Any change to `compare.mjs` or `provision.mjs` — untouched per the
  source PRD's own "What We're NOT Building" guarantee; the blocking-
  vs-non-blocking routing changes ONLY in the calling command.
- `/relay-execute`'s cross-phase halt/resume semantics for the
  `human`-mode pending-approval case — Phase 6's job entirely. This
  phase defines the halt OUTCOME NAME and `halt.json` SHAPE only; a
  single `/relay-implement` invocation HALTs and exits — it does not
  know about, and does not implement, any multi-phase orchestration
  resume logic.
- The `/relay-visual-approve` infra command itself (evidence surfacing,
  explicit confirmation, audit-logged flip, rejection→feedback
  routing) — Phase 6's job. This phase's `AWAITING_VISUAL_APPROVAL`
  halt message forward-references it by name only.
- Any change to `plugins/relay/commands/relay-visual-review.md` — none
  needed. It dispatches `visual-verifier` directly (never through
  `Phase A.3.4`'s dual-mode gate) and automatically inherits the
  `Interaction` pass-through once `visual-verifier.md` and
  `capture.mjs` are updated; it remains read-only/non-blocking by its
  own existing, unrelated contract regardless of `phase_scope`.
- Per-frame state variants beyond the single Figma-drawn state (a
  Should item, not this phase), smoke-render assertions for
  un-pinned interactive states (a Could item), and a typed-contract-
  first phase (a Could item) — all deferred per the source PRD's own
  MoSCoW.
- Any new PRD-table column or new orchestrator sequencing primitive —
  `phase_scope`/`visual_first` stay exactly as shipped by Phases 1-3;
  this phase only reads the existing field.
- Sentinel-ledger enforcement changes — Phase 4's job, already
  shipped; this phase's implement-time gate runs after the Implementer
  and Code Review have already produced an APPROVED diff, and does not
  re-check sentinel resolution itself.
- New test files of any kind — `tdd: false` + `test_frameworks:
  ["node:test"]` selects test-after ordering; the test-writer/
  test-reviewer pair authors and maintains `capture.mjs`'s unit
  coverage AFTER the Implementer + Code Review (R-X strict — the
  Implementer authors ZERO test files). No task below creates,
  edits, or references a `*.test.mjs` file.

## Step-by-Step Tasks

### Task 1: UPDATE capture.mjs — add `parseInteractionScript()`

**ACTION**: Immediately after `frameFilename()` (currently lines
48-50) and before `captureFrame()` (currently starting line 52), add a
new exported pure function:

```js
// Bounded interaction-step vocabulary — mirrors
// docs/context/design-spec-template.md's `Interaction` column syntax
// exactly: click(<selector>), fill(<selector>, <value>),
// wait(<ms> | <selector>), semicolon-separated, executed in order
// before capture. Absent/"none" parses to zero steps (additive,
// zero-effect on every frame that declares no Interaction script).
const INTERACTION_STEP_PATTERN = /^(click|fill|wait)\((.*)\)$/;

export function parseInteractionScript(interaction) {
  if (!interaction || interaction === 'none') return [];
  return interaction.split(';').map((raw) => {
    const step = raw.trim();
    const match = step.match(INTERACTION_STEP_PATTERN);
    if (!match) {
      throw new Error(`unrecognized interaction step: "${step}"`);
    }
    const [, verb, argsRaw] = match;
    if (verb === 'click') {
      return { verb: 'click', selector: argsRaw.trim() };
    }
    if (verb === 'fill') {
      const [selector, ...valueParts] = argsRaw.split(',');
      return { verb: 'fill', selector: selector.trim(), value: valueParts.join(',').trim() };
    }
    const arg = argsRaw.trim();
    if (/^\d+$/.test(arg)) {
      return { verb: 'wait', ms: Number(arg) };
    }
    return { verb: 'wait', selector: arg };
  });
}
```

Also update the top-of-file manifest-shape comment (the bulleted
example around the current lines 16-27) to add a 9th documented field:
`"interaction": "click(<selector>); wait(300)" | "none"` immediately
after the existing `"masks": []` line in that example, so the comment
stays accurate to the manifest shape (per this repo's established
comment-accuracy discipline).

**MIRROR**: Pattern 5 (`docs/context/design-spec-template.md:113`).

**ADDRESSES**: AC-A4, AC-A5

**VALIDATE**:
```sh
set -euo pipefail
node --check plugins/relay/scripts/visual/capture.mjs
node -e "
import('./plugins/relay/scripts/visual/capture.mjs').then((m) => {
  if (typeof m.parseInteractionScript !== 'function') {
    console.error('FAIL: capture.mjs must export parseInteractionScript');
    process.exit(1);
  }
  const steps = m.parseInteractionScript('click(#a); fill(#b, hello); wait(500)');
  const shape = steps.map((s) => s.verb).join(',');
  if (shape !== 'click,fill,wait' || steps[2].ms !== 500) {
    console.error('FAIL: parseInteractionScript did not parse the 3-verb example correctly: ' + JSON.stringify(steps));
    process.exit(1);
  }
  if (m.parseInteractionScript('none').length !== 0 || m.parseInteractionScript(undefined).length !== 0) {
    console.error('FAIL: parseInteractionScript must return [] for \"none\"/undefined');
    process.exit(1);
  }
  console.log('PASS: parseInteractionScript exported and parses the bounded vocabulary correctly');
}).catch((e) => { console.error('FAIL: ' + e.message); process.exit(1); });
"
```

### Task 2: UPDATE capture.mjs — add `executeInteractionSteps()` and wire it into `captureFrame()`

**ACTION**: Immediately after `parseInteractionScript()` (added by
Task 1) and before `captureFrame()`, add:

```js
async function executeInteractionSteps(page, steps) {
  for (const step of steps) {
    // Sequential on purpose — an ordered choreography script.
    // eslint-disable-next-line no-await-in-loop
    if (step.verb === 'click') {
      await page.click(step.selector);
    } else if (step.verb === 'fill') {
      await page.fill(step.selector, step.value);
    } else if (step.verb === 'wait' && step.ms != null) {
      await page.waitForTimeout(step.ms);
    } else if (step.verb === 'wait') {
      await page.waitForSelector(step.selector);
    }
  }
}
```

Export it (`export async function executeInteractionSteps(...)`) for
the same testability reason `parseInteractionScript` is exported. Then
inside `captureFrame()`, between the existing `await page.goto(frame.route, { waitUntil: 'networkidle' });`
line and the existing `const outputPath = path.join(...)` /
`await page.screenshot(...)` lines, insert:

```js
    const interactionSteps = parseInteractionScript(frame.interaction);
    if (interactionSteps.length > 0) {
      await executeInteractionSteps(page, interactionSteps);
    }
```

Any error thrown by `parseInteractionScript` (malformed step) or by
`executeInteractionSteps` (e.g. selector not found) propagates up into
`captureFrame`'s existing `try`/`catch`, which already converts any
error into `{ node_id, captured: false, error: ... }` — no new
error-handling path is introduced; the existing one is reused
unchanged.

**MIRROR**: Pattern 4 (`plugins/relay/scripts/visual/capture.mjs:61-66`).

**ADDRESSES**: AC-A4, AC-A5

**VALIDATE**:
```sh
set -euo pipefail
node --check plugins/relay/scripts/visual/capture.mjs
node -e "
import('./plugins/relay/scripts/visual/capture.mjs').then(async (m) => {
  if (typeof m.executeInteractionSteps !== 'function') {
    console.error('FAIL: capture.mjs must export executeInteractionSteps');
    process.exit(1);
  }
  const calls = [];
  const fakePage = {
    click: async (sel) => calls.push(['click', sel]),
    fill: async (sel, val) => calls.push(['fill', sel, val]),
    waitForTimeout: async (ms) => calls.push(['waitForTimeout', ms]),
    waitForSelector: async (sel) => calls.push(['waitForSelector', sel]),
  };
  const steps = m.parseInteractionScript('click(#a); fill(#b, hi); wait(200); wait(#c)');
  await m.executeInteractionSteps(fakePage, steps);
  const expected = JSON.stringify([['click', '#a'], ['fill', '#b', 'hi'], ['waitForTimeout', 200], ['waitForSelector', '#c']]);
  if (JSON.stringify(calls) !== expected) {
    console.error('FAIL: executeInteractionSteps drove the wrong page methods: ' + JSON.stringify(calls));
    process.exit(1);
  }
  const noopCalls = [];
  const fakePage2 = { click: async () => noopCalls.push('x'), fill: async () => noopCalls.push('x'), waitForTimeout: async () => noopCalls.push('x'), waitForSelector: async () => noopCalls.push('x') };
  await m.executeInteractionSteps(fakePage2, []);
  if (noopCalls.length !== 0) {
    console.error('FAIL: executeInteractionSteps must be a no-op for an empty steps array');
    process.exit(1);
  }
  console.log('PASS: executeInteractionSteps drives a fake page in order and is a no-op when steps is empty');
}).catch((e) => { console.error('FAIL: ' + e.message); process.exit(1); });
"
node -e "
const src = require('fs').readFileSync('plugins/relay/scripts/visual/capture.mjs', 'utf8');
const gotoIdx = src.indexOf('page.goto(frame.route');
const execIdx = src.indexOf('await executeInteractionSteps(page');
const shotIdx = src.indexOf('page.screenshot(');
if (!(gotoIdx > -1 && execIdx > gotoIdx && shotIdx > execIdx)) {
  console.error('FAIL: executeInteractionSteps must be wired strictly between page.goto and page.screenshot in captureFrame');
  process.exit(1);
}
console.log('PASS: interaction execution wired between goto and screenshot');
"
```

### Task 3: UPDATE visual-verifier.md — pass `interaction` through the frame manifest

**ACTION**: Replace the current `## Step 0` sub-step 3 sentence (line
100: "Build the in-memory frame manifest: one entry per Visual
Acceptance Criteria row — `{node_id, route, preconditions, auth_mode,
viewport: {width, height}, diff_threshold, ref_png, masks}`.") with:
"Build the in-memory frame manifest: one entry per Visual Acceptance
Criteria row — `{node_id, route, preconditions, auth_mode, viewport:
{width, height}, diff_threshold, ref_png, masks, interaction}`. Read
the row's `Interaction` column (the 9th column, added by Phase 1 of
this same PRD to `docs/context/design-spec-template.md`); when the
column is absent from a given Design Spec (a pre-Phase-5 spec) or the
cell is empty, set `interaction: \"none\"` — the exact no-op sentinel
`capture.mjs`'s `parseInteractionScript` treats as zero steps (Phase 5
Task 1 of `figma-visual-first-track.prd.md`)." Keep this as one
contiguous sentence on one physical line, matching the original line's
own formatting. Separately, in sub-step 2 (line 99), update the stale
"8-field shape" enumeration ("node-id, route, preconditions, auth
mode, viewport, diff threshold, ref PNG path + dims, masks") to a
9-field one by appending ", interaction" — this is pre-existing drift
from Phase 1's own column addition, corrected here since this task
touches the exact same paragraph.

**MIRROR**: Pattern 3 (`plugins/relay/agents/visual-verifier.md:100`).

**ADDRESSES**: AC-A4, AC-A5

**VALIDATE**:
```sh
set -euo pipefail
node -e "
const src = require('fs').readFileSync('plugins/relay/agents/visual-verifier.md', 'utf8');
if (!src.includes('masks, interaction}')) {
  console.error('FAIL: Step 0 frame manifest entry must include interaction alongside masks on one line');
  process.exit(1);
}
if (!src.includes('interaction: \"none\"')) {
  console.error('FAIL: Step 0 must document the none default for an absent Interaction column/cell');
  process.exit(1);
}
console.log('PASS: visual-verifier.md frame manifest passes interaction through, with a documented none default');
"
```

### Task 4: UPDATE relay-implement.md — read `phase_scope` + `visual_first_approval` in Phase A.3.4

**ACTION**: In `plugins/relay/commands/relay-implement.md`'s `### Phase A.3.4 — Visual-verification dispatch`
section, renumber the existing items 3 (`**Step A** — dispatch...`), 4
(`**Step B** — branch...`), 5 (`**No commit issued.**`) to 4, 5, 6
respectively (change the leading `3.`/`4.`/`5.` digits only; their
bodies are untouched by this task). Insert a NEW item 3, between the
existing item 2 (`**Budget init.**`) and the newly-renumbered item 4
(`**Step A**`), reading exactly: "3. **Dual-mode read (new).** Read
the plan at `<plan_path>`'s `## Metadata` table for a `phase_scope`
row (values `visual`/`logic`; absent when the source PRD does not
declare `visual_first: true`). Record `phase_scope_value` (`\"visual\"`,
`\"logic\"`, or `null` when the row is absent) — read verbatim, never
inferred from row content or task prose (mirrors the non-heuristic
`phase_scope` sourcing lineage shipped in Phase 3). Read
`<target_root>/docs/context/methodology.md` frontmatter for
`visual_first_approval` (values `auto`/`human`); record
`visual_approval_mode`, defaulting to `\"auto\"` only when the key is
entirely absent from the frontmatter — mirrors the `figma_track`/
`docs_sync` default-when-absent idiom already used earlier in this
same Phase A.0 (`plugins/relay/commands/relay-implement.md:203-220`).
Non-visual byte-identical guarantee: when `phase_scope_value` is not
`\"visual\"`, steps 4-6 below are unchanged — `phase_scope_value` and
`visual_approval_mode` are read but not consulted again until the new
terminal-routing paragraph a following task inserts after step 5."

**MIRROR**: Pattern 1 (`plugins/relay/commands/relay-implement.md:216-218`).

**ADDRESSES**: AC-A1, AC-A3

**VALIDATE**:
```sh
set -euo pipefail
node -e "
const src = require('fs').readFileSync('plugins/relay/commands/relay-implement.md', 'utf8');
for (const token of ['phase_scope_value', 'visual_approval_mode', 'byte-identical']) {
  if (!src.includes(token)) {
    console.error('FAIL: Phase A.3.4 missing required token: ' + token);
    process.exit(1);
  }
}
console.log('PASS: Phase A.3.4 reads phase_scope_value + visual_approval_mode with an explicit non-visual byte-identical guarantee');
"
```

### Task 5: UPDATE relay-implement.md — dual-mode terminal routing in Phase A.3.4

**ACTION**: This task assumes Task 4 has already run — Step A/Step
B/No-commit-issued are already renumbered to items 4/5/6, and Task 4
only ever changed each item's leading digit, never its body — so this
task's edits below never touch the same line Task 4 touched.

**Part A — edit the renumbered item 5 (`**Step B** — branch on the
returned verdict:`) itself.** Step B's own bullets currently end each
terminal branch with a bare "proceed to Phase A.3.5" — five such sites
exist, and the Terminal-routing paragraph inserted by Part B below
must govern ALL FIVE (none is exempt: every one represents the same
underlying decision — whether to advance past Phase A.3.4 — that
`phase_scope_value`/`visual_approval_mode` must be allowed to
intercept). Insert the identical, token-identical suffix `(subject to
the Terminal-routing rule below)` immediately after "proceed to Phase
A.3.5" at each of the five sites, changing nothing else in Step B's
text:
1. `VISUAL_VERIFIED` bullet: "...`visual_outcome = \"APPROVED\"`;
   proceed to Phase A.3.5." becomes "...`visual_outcome =
   \"APPROVED\"`; proceed to Phase A.3.5 (subject to the
   Terminal-routing rule below)."
2. `VISUAL_DEGRADED` bullet: "...proceed to Phase A.3.5 WITHOUT
   halting (this is the AC-5 non-blocking guarantee)." becomes
   "...proceed to Phase A.3.5 (subject to the Terminal-routing rule
   below) WITHOUT halting (this is the AC-5 non-blocking guarantee)."
3. `VISUAL_MISMATCH`'s deterministic-revert sub-case: "...set
   `visual_outcome = \"BUDGET_EXCEEDED_REVERTED\"`; proceed to Phase
   A.3.5 WITHOUT halting." becomes "...set `visual_outcome =
   \"BUDGET_EXCEEDED_REVERTED\"`; proceed to Phase A.3.5 (subject to
   the Terminal-routing rule below) WITHOUT halting."
4. `VISUAL_MISMATCH`'s fix-round-succeeds sub-case: "...set
   `visual_outcome` from that re-dispatch's own verdict
   (`\"APPROVED\"` or the named degraded rung); proceed to Phase
   A.3.5." becomes "...set `visual_outcome` from that re-dispatch's
   own verdict (`\"APPROVED\"` or the named degraded rung); proceed to
   Phase A.3.5 (subject to the Terminal-routing rule below)."
5. `VISUAL_MISMATCH`'s budget-exhausted-without-a-fix-round sub-case:
   "...set `visual_outcome = \"BUDGET_EXCEEDED\"`; proceed to Phase
   A.3.5 WITHOUT halting." becomes "...set `visual_outcome =
   \"BUDGET_EXCEEDED\"`; proceed to Phase A.3.5 (subject to the
   Terminal-routing rule below) WITHOUT halting."

**Part B — insert the Terminal-routing paragraph.** Immediately after
the now-forward-referencing item 5 (`**Step B**`) and BEFORE the
renumbered item 6 (`**No commit issued.**`), insert a new unnumbered
paragraph:

"**Terminal routing (dual-mode, new).** Step 5 above reaches \"proceed
to Phase A.3.5\" from several distinct points — the `VISUAL_VERIFIED`
bullet, the `VISUAL_DEGRADED` bullet, and (inside the `VISUAL_MISMATCH`
bullet) its deterministic-revert sub-case, its
budget-exhausted-without-a-fix-round sub-case, and its
fix-round-succeeds sub-case, whose own re-dispatched `visual-verifier`
verdict may itself be `VISUAL_VERIFIED` OR `VISUAL_DEGRADED`. Every one
of those points, and the verdict-reaching mechanics that reach them
(dispatch, fix-round retry, deterministic revert), are UNCHANGED; only
whether reaching \"proceed to Phase A.3.5\" is ALLOWED is new. The rule
below is written as an inverse — block unless the outcome is exactly
`VISUAL_VERIFIED` — precisely so it cannot silently miss one of those
points the way a branch enumeration can:
- When `phase_scope_value != \"visual\"` (absent, or `\"logic\"`):
  proceed to Phase A.3.5 immediately, exactly as step 5 already says —
  byte-identical to today, non-visual path unchanged.
- When `phase_scope_value == \"visual\"` AND `visual_approval_mode ==
  \"human\"`: regardless of which point above was reached (including a
  genuine `VISUAL_VERIFIED` result), do NOT proceed to Phase
  A.3.5. Write `<artifact_root>../halt.json` with `{outcome:
  \"AWAITING_VISUAL_APPROVAL\", phase_scope: \"visual\",
  final_visual_verdict: \"<VISUAL_VERIFIED|VISUAL_DEGRADED|
  VISUAL_MISMATCH>\", fidelity_report_path, attempt_history,
  actionable_recommendation: \"Run /relay-visual-approve (Phase 6 of
  PRPs/prds/figma-visual-first-track.prd.md; not yet built as of this
  phase) to review the captures at <fidelity_report_path> and approve
  or reject. Until then this phase cannot reach complete.\"}`. HALT the
  entire `/relay-implement` invocation (Phase A.3.5 and Phase A.4 are
  never entered — no docs-sync, no D8 mutation) with the verbatim
  message:
  > AWAITING_VISUAL_APPROVAL. The visual gate reached a final verdict
  > (`<final_visual_verdict>`) but `visual_first_approval: human`
  > requires explicit human review before this phase can complete —
  > never silently proceeding on a mismatch or an unreviewed pass
  > (source PRD AC-4 of `figma-visual-first-track.prd.md`). Fidelity
  > report at `<fidelity_report_path>`. Run `/relay-visual-approve`
  > (Phase 6 of the same PRD; not yet built as of this phase) once
  > available to review the captures and approve or reject. Halt state
  > at `<artifact_root>../halt.json`. No commit has been made and no
  > D8 mutation has occurred — the plan remains `APPROVED`, the source
  > PRD row remains `in-progress`.
- When `phase_scope_value == \"visual\"` AND `visual_approval_mode ==
  \"auto\"` (or absent, defaulting to `auto`): proceed to Phase A.3.5
  ONLY when the point reached is a genuine `VISUAL_VERIFIED` result —
  `visual_outcome = \"APPROVED\"`, D8 continues normally, exactly as
  step 5 already says — whether that is step 5's own `VISUAL_VERIFIED`
  bullet, or the `VISUAL_MISMATCH` bullet's fix-round-succeeds
  sub-case when its re-dispatched verdict is itself `VISUAL_VERIFIED`.
  For every OTHER point step 5's mechanics can reach —
  `VISUAL_DEGRADED` (step 5's own bullet, OR the fix-round-succeeds
  sub-case's re-dispatched verdict coming back `VISUAL_DEGRADED`
  instead of `VISUAL_VERIFIED` — the case a plain branch enumeration
  can miss), the deterministic-revert sub-case
  (`BUDGET_EXCEEDED_REVERTED`), or the
  budget-exhausted-without-a-fix-round sub-case (`BUDGET_EXCEEDED`) —
  do NOT proceed to Phase A.3.5. Write `<artifact_root>../halt.json`
  with `{outcome:
  \"VISUAL_GATE_BLOCKED\", phase_scope: \"visual\",
  final_visual_verdict: \"<VISUAL_DEGRADED|VISUAL_MISMATCH>\",
  fidelity_report_path, attempt_history, actionable_recommendation:
  \"Fix the visual implementation or its mocks and re-run
  /relay-implement, or set visual_first_approval: human in
  docs/context/methodology.md to route through human review
  instead.\"}`. HALT with the verbatim message:
  > VISUAL_GATE_BLOCKED. The visual-scoped blocking gate did not reach
  > `VISUAL_VERIFIED` (final verdict: `<final_visual_verdict>`) within
  > `max_visual_retries=2`. `visual_first_approval: auto` requires a
  > clean `VISUAL_VERIFIED` result to complete this phase — never
  > silently proceeding on a mismatch (source PRD AC-4 of
  > `figma-visual-first-track.prd.md`). Fidelity report at
  > `<fidelity_report_path>`. Fix the visual implementation or its
  > mocks and re-run `/relay-implement`, or switch
  > `visual_first_approval` to `human` in
  > `docs/context/methodology.md` to route through human review
  > instead. Halt state at `<artifact_root>../halt.json`. No commit
  > has been made and no D8 mutation has occurred.

`max_visual_retries=2` is the SAME budget variable step 2 (Budget
init) already initializes — this routing paragraph introduces no new
budget."

**MIRROR**: Pattern 2 (`plugins/relay/commands/relay-implement.md:226-233`).

**ADDRESSES**: AC-A1, AC-A2, AC-A6

**VALIDATE**:
```sh
set -euo pipefail
node -e "
const src = require('fs').readFileSync('plugins/relay/commands/relay-implement.md', 'utf8');
const required = ['AWAITING_VISUAL_APPROVAL', 'VISUAL_GATE_BLOCKED', 'visual_approval_mode == \"human\"', 'phase_scope_value == \"visual\"'];
const missing = required.filter((s) => !src.includes(s));
if (missing.length > 0) {
  console.error('FAIL: relay-implement.md missing required dual-mode tokens: ' + JSON.stringify(missing));
  process.exit(1);
}
console.log('PASS: dual-mode terminal routing present with both new outcome codes and the human/auto gate conditions');
"
node -e "
const src = require('fs').readFileSync('plugins/relay/commands/relay-implement.md', 'utf8');
const preserved = ['visual_outcome = \"APPROVED\"', 'BUDGET_EXCEEDED_REVERTED', 'visual_outcome = \"BUDGET_EXCEEDED\"'];
const missing = preserved.filter((s) => !src.includes(s));
if (missing.length > 0) {
  console.error('FAIL: pre-existing non-blocking outcome vocabulary was removed or altered: ' + JSON.stringify(missing));
  process.exit(1);
}
console.log('PASS: pre-existing non-blocking outcome vocabulary preserved (inertness guarantee)');
"
node -e "
const src = require('fs').readFileSync('plugins/relay/commands/relay-implement.md', 'utf8');
const marker = '(subject to the Terminal-routing rule below)';
const count = src.split(marker).length - 1;
if (count !== 5) {
  console.error('FAIL: expected exactly 5 Terminal-routing forward-references across the five Step B \"proceed to Phase A.3.5\" sites, found ' + count);
  process.exit(1);
}
console.log('PASS: all five Step B \"proceed to Phase A.3.5\" sites carry the Terminal-routing forward-reference');
"
```

### Task 6: UPDATE relay-implement.md — register the two new outcomes in the HALT enumeration + Constraints

**ACTION**: In `## Final output surface`, in the sentence beginning
"On HALT (one of `FAILED_AFTER_N_RETRIES`, `FAILED_TIME_BUDGET_EXCEEDED`,
`FAILED_OSCILLATION_DETECTED`, `FAILED_DISPUTE_CAP_EXCEEDED`,
`DISPUTE_UPHELD_TEST_WRONG`, `DISPUTE_UPHELD_PRD_AMBIGUOUS`,
`PARTIAL_D8_FAILURE`, or any precondition HALT), ...", insert
`` `AWAITING_VISUAL_APPROVAL`, `VISUAL_GATE_BLOCKED`, `` immediately
after `` `PARTIAL_D8_FAILURE`, `` and before `or any precondition
HALT` — keep the whole sentence on its existing single line/paragraph,
do not introduce a line break. In `## Constraints (hard rules)` item 6
("Never bypass D8."), append a new sentence at the very end of that
item's existing paragraph: "The visual-scoped blocking-gate halts
(`AWAITING_VISUAL_APPROVAL`, `VISUAL_GATE_BLOCKED`) occur inside Phase
A.3.4, strictly before Phase A.3.5 (docs-sync) and Phase A.4 (D8) ever
run — D8 is never attempted for either, mirroring every other named
HALT above it in the pipeline."

**MIRROR**: Pattern 2 (`plugins/relay/commands/relay-implement.md:226-233`) — the same named-outcome vocabulary this task registers into the two cross-reference sites.

**ADDRESSES**: AC-A1, AC-A6

**VALIDATE**:
```sh
set -euo pipefail
node -e "
const src = require('fs').readFileSync('plugins/relay/commands/relay-implement.md', 'utf8');
if (!src.includes('AWAITING_VISUAL_APPROVAL\`, \`VISUAL_GATE_BLOCKED')) {
  console.error('FAIL: the On HALT enumeration must list the two new outcomes adjacently, right after PARTIAL_D8_FAILURE');
  process.exit(1);
}
if (!src.includes('D8 is never attempted for either')) {
  console.error('FAIL: Constraints item 6 must state D8 is never attempted for the two new visual-scoped halts');
  process.exit(1);
}
console.log('PASS: HALT enumeration and Constraints both register the two new outcomes');
"
```

### Task 7: UPDATE documentation/changelog.html — Unreleased entry

**ACTION**: Add a new `<li>` under the existing `<h3
id="unreleased-added">Added</h3>` `<ul>` (do NOT create a new `<h2>`
release heading, do NOT bump `plugins/relay/.claude-plugin/plugin.json`
— stays under `Unreleased` so `version-parity` remains green),
describing: "`/relay-implement`'s Phase A.3.4 is dual-mode: on
`phase_scope: visual` plans, the visual gate now genuinely blocks
completion until `VISUAL_VERIFIED` (`auto` mode) or explicit human
review (`human` mode) via two new HALT outcomes,
`AWAITING_VISUAL_APPROVAL` and `VISUAL_GATE_BLOCKED`; every other plan
(`phase_scope` absent, or `phase_scope: logic`) keeps today's
non-blocking regression byte-identical. `capture.mjs` gains an
additive interaction-step executor (bounded `click`/`fill`/`wait`
vocabulary) for frames declaring a Design Spec `Interaction` script;
`visual-verifier.md` passes the column through; `compare.mjs`/
`provision.mjs` untouched. Part of the Figma Visual-First Track, Phase
5 of `PRPs/prds/figma-visual-first-track.prd.md`." Match the exact
`<code>` tagging and "Part of ..., Phase N of ..." closing-sentence
style of the sibling entries already in the same list.

**MIRROR**: N/A — matches the established `<li>`-under-`Unreleased`
shape every sibling phase of this track already used (see
`documentation/changelog.html`'s current Phase 1-4 entries).

**ADDRESSES**: AC-A1 through AC-A6 (documentation of record)

**VALIDATE**:
```sh
set -euo pipefail
node -e "
const src = require('fs').readFileSync('documentation/changelog.html', 'utf8');
if (!src.includes('figma-visual-first-track.prd.md') || !src.includes('id=\"unreleased-added\"') || !src.includes('AWAITING_VISUAL_APPROVAL')) {
  console.error('FAIL: changelog Unreleased entry missing or incomplete');
  process.exit(1);
}
console.log('PASS: changelog Unreleased entry added');
"
```

## Validation Commands

**Level 1 — STATIC_ANALYSIS**
```sh
set -euo pipefail
node --check plugins/relay/scripts/visual/capture.mjs
npm run validate
```

**Level 2 — CONTENT_INVARIANTS**
```sh
set -euo pipefail
node -e "
import('./plugins/relay/scripts/visual/capture.mjs').then((m) => {
  if (typeof m.parseInteractionScript !== 'function' || typeof m.executeInteractionSteps !== 'function') {
    console.error('FAIL: capture.mjs must export both parseInteractionScript and executeInteractionSteps');
    process.exit(1);
  }
  console.log('PASS: capture.mjs exports both new functions');
}).catch((e) => { console.error('FAIL: ' + e.message); process.exit(1); });
"
node -e "
const vv = require('fs').readFileSync('plugins/relay/agents/visual-verifier.md', 'utf8');
const ri = require('fs').readFileSync('plugins/relay/commands/relay-implement.md', 'utf8');
const checks = [
  [vv.includes('masks, interaction}'), 'visual-verifier.md frame manifest missing interaction'],
  [ri.includes('phase_scope_value'), 'relay-implement.md missing phase_scope_value read'],
  [ri.includes('visual_approval_mode'), 'relay-implement.md missing visual_approval_mode read'],
  [ri.includes('AWAITING_VISUAL_APPROVAL'), 'relay-implement.md missing AWAITING_VISUAL_APPROVAL outcome'],
  [ri.includes('VISUAL_GATE_BLOCKED'), 'relay-implement.md missing VISUAL_GATE_BLOCKED outcome'],
  [ri.includes('visual_outcome = \"APPROVED\"'), 'relay-implement.md lost the pre-existing APPROVED outcome (inertness violation)'],
  [ri.includes('BUDGET_EXCEEDED_REVERTED'), 'relay-implement.md lost the pre-existing BUDGET_EXCEEDED_REVERTED outcome (inertness violation)'],
];
const failed = checks.filter(([ok]) => !ok);
if (failed.length > 0) {
  for (const [, msg] of failed) console.error('FAIL: ' + msg);
  process.exit(1);
}
console.log('PASS: all content invariants across the three edited files hold');
"
```

**Level 3 — INTEGRATION (dry run, no live browser)**
```sh
set -euo pipefail
node -e "
import('./plugins/relay/scripts/visual/capture.mjs').then(async (m) => {
  const calls = [];
  const fakePage = {
    click: async (sel) => calls.push(['click', sel]),
    fill: async (sel, val) => calls.push(['fill', sel, val]),
    waitForTimeout: async (ms) => calls.push(['wait', ms]),
    waitForSelector: async (sel) => calls.push(['waitsel', sel]),
  };
  const steps = m.parseInteractionScript('click(.menu-toggle); wait(#menu-open); fill(#promo, SAVE10); wait(300)');
  await m.executeInteractionSteps(fakePage, steps);
  if (calls.length !== 4) {
    console.error('FAIL: end-to-end parse+execute integration did not drive all 4 steps: ' + JSON.stringify(calls));
    process.exit(1);
  }
  console.log('PASS: parse -> execute integration drives a fake page through a full 4-step, 3-verb script');
}).catch((e) => { console.error('FAIL: ' + e.message); process.exit(1); });
"
node -e "
const src = require('fs').readFileSync('plugins/relay/commands/relay-implement.md', 'utf8');
const gateIdx = src.indexOf('phase_scope_value == \"visual\"');
const awaitingIdx = src.indexOf('AWAITING_VISUAL_APPROVAL');
const blockedIdx = src.indexOf('VISUAL_GATE_BLOCKED');
if (!(gateIdx > -1 && awaitingIdx > gateIdx && blockedIdx > gateIdx)) {
  console.error('FAIL: dry-run structural check failed — both new outcomes must appear textually after the phase_scope_value == \"visual\" gate, never unconditionally');
  process.exit(1);
}
const nonVisualIdx = src.indexOf('byte-identical to today, non-visual path unchanged');
if (nonVisualIdx < 0 || nonVisualIdx > awaitingIdx) {
  console.error('FAIL: the non-visual byte-identical guarantee must be stated before the new outcomes are introduced');
  process.exit(1);
}
console.log('PASS: dry-run confirms the two new outcomes are textually gated behind phase_scope_value == \"visual\", and the non-visual byte-identical guarantee precedes them');
"
```

Every command above either exits with the natural non-zero status of a
failing `node -e`/`node --check`/`npm run validate` invocation, or an
explicit `process.exit(1)` inside the script — none rely on the
forbidden `<check> && echo "PASS" || echo "FAIL"` idiom, per the
2026-07-09 decision and `plan-reviewer`'s `R-COH-VALIDATE-ALWAYS-PASS`.

## Acceptance Criteria

- **AC-A1 (PRD AC-4):** Given a `phase_scope: visual` plan's
  Implementer diff has passed code review, when `visual-verifier`
  returns anything other than a clean `VISUAL_VERIFIED` result (in
  `auto` mode) or has not yet received explicit human approval (in
  `human` mode), then `/relay-implement` HALTs (`VISUAL_GATE_BLOCKED`
  or `AWAITING_VISUAL_APPROVAL`) and the phase does not reach
  `complete` — never silently proceeding on a mismatch.
- **AC-A2 (PRD AC-6):** Given a `phase_scope: logic` phase (or any
  phase whose plan carries no `phase_scope` row) reaches code-review
  `APPROVED`, when `Phase A.3.4` runs, then its outcome
  (`APPROVED`/degraded rung/`BUDGET_EXCEEDED`/`BUDGET_EXCEEDED_REVERTED`/
  `SKIPPED (...)`) is recorded and surfaced exactly as it is today —
  the command always proceeds to Phase A.3.5, never blocking.
- **AC-A3 (PRD AC-1):** Given this plan's own source PRD (which does
  not declare `visual_first: true`, so this very plan's `## Metadata`
  table correctly carries no `phase_scope` row) or any project whose
  `docs/context/methodology.md` declares no `visual_first_approval`
  key, when `Phase A.3.4` runs, then it reads `phase_scope_value` as
  `null` and `visual_approval_mode` as `"auto"` (default) without
  emitting any new behavior — the dual-mode gate activates only on an
  explicit `phase_scope: visual` declaration.
- **AC-A4 (PRD AC-4):** Given a frame whose Design Spec row declares a
  non-`"none"` `Interaction` script, when `capture.mjs` captures that
  frame, then it executes the parsed click/fill/wait steps, in order,
  after `page.goto` and before `page.screenshot` — so
  interaction-reached states are part of the captured (and, on the
  blocking path, gating) pixel diff.
- **AC-A5 (PRD AC-4):** Given a frame whose `interaction` is absent or
  `"none"`, when `capture.mjs` captures that frame, then zero
  interaction-related calls occur on the Playwright page —
  byte-identical to today's capture behavior for every frame that does
  not adopt the new column: the structural, same-mechanism sibling of
  AC-A4's interaction-present case — both describe the inner script's
  per-frame behavior that PRD AC-4's blocking gate ultimately depends
  on evaluating correctly, and both share Tasks 1/2/3's `ADDRESSES`
  list.
- **AC-A6 (PRD AC-4, human-mode specifically):** Given a
  `phase_scope: visual` plan with `visual_first_approval: human`, when
  `visual-verifier` returns `VISUAL_VERIFIED` (a clean machine pass),
  then `/relay-implement` still does NOT auto-complete the phase — it
  HALTs with `AWAITING_VISUAL_APPROVAL`, requiring the explicit human
  review step this PRD's `human` tier exists to guarantee.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| The new resumable-halt category (`AWAITING_VISUAL_APPROVAL`) has no existing precedent in this repo to mirror structurally — the closest analog, `DISPUTE_UPHELD_*`, is terminal/PRD-hand-edit-requiring, not resumable | Medium | Medium | The `halt.json` shape reuses the SAME top-level keys as every existing named halt (`outcome`, `attempt_history`, `actionable_recommendation`) so Phase 6's `/relay-execute`/`/relay-visual-approve` work can extend rather than redesign it; the halt message explicitly names Phase 6 as the not-yet-built consumer |
| `auto` mode now blocks where v1 never did — a real feature run could stall if a mocked capture is subtly wrong for a reason outside the implementer's control (e.g. a Design Spec masking/threshold issue) | Medium | Medium | The existing fix-round + deterministic-revert mechanic (unchanged, reused verbatim) still runs before the final block; the `VISUAL_GATE_BLOCKED` message explicitly suggests switching `visual_first_approval` to `human` as an escape hatch |
| Interaction-step execution inherits the flakiness classes documented for Playwright screenshot automation generally (media-loading progress, DPR/subpixel variance, event-ordering quirks) — confirmed via research-web against a primary engineering source | Low-Medium | Low | Out of this phase's control surface (masking/threshold/animation-freezing is a Design Spec / `compare.mjs` concern, both untouched here); `click`/`fill` use Playwright's own built-in actionability auto-waiting, and the explicit `wait()` step exists precisely for interaction-specific settling time |
| Windows-specific defect classes that hit v1 (a `file://${process.argv[1]}` CLI-guard mismatch; `execFileAsync`/`npx` ENOENT) | None, by construction | N/A | This phase adds no new CLI entry point and no new subprocess/shell-out of any kind — `executeInteractionSteps` calls Playwright's `page.click`/`page.fill`/`page.waitForTimeout`/`page.waitForSelector` methods directly, never `node:child_process`; the existing `pathToFileURL(process.argv[1]).href` CLI guard (`capture.mjs:119`) is untouched by every task in this plan |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of
`tdd` in `docs/context/methodology.md`: **false**. Test-after
ordering — when a test framework is declared, the test pair
(test-writer/test-reviewer) authors and maintains the suite from the
Acceptance Criteria above, after the Implementer + Code Review; with
no framework declared, no tests are authored. `test_frameworks:
["node:test"]` IS declared here, so the pair is ACTIVE: the Implementer
authors `capture.mjs`'s two new functions (production code only) and
authors ZERO test files (R-X strict). `scripts/validate/checks/
figma-visual-first-track-phase5.test.mjs` (or equivalent) is authored
test-after by the test-writer/test-reviewer pair once this phase's
implementation lands, exercising `parseInteractionScript`/
`executeInteractionSteps` against good/bad fixtures beyond this plan's
own smoke-level VALIDATE coverage.

**Research grounding:** `research-codebase` and `research-web`
subagents were dispatched in parallel per protocol. `research-codebase`
confirmed exact line numbers for every insertion point cited above and
flagged two useful gaps: (1) no existing halt-outcome name in this repo
matches an `AWAITING_*`/`*_GATE` shape — the two new names are
genuinely novel, not a reuse of an existing category; (2)
`visual-verifier.md`'s own Step 0 prose already carried stale
"8-field" wording predating Phase 1's 9th-column addition, corrected
opportunistically by Task 3 above since it touches the same paragraph.
`research-web` corroborated the interaction-scripting design against
Storybook's play-function pattern and Applitools'
`beforeRenderScreenshotHook` (the closest documented "execute
immediately before snapshot" precedent), and against GitHub Actions'
required-reviewers gate for the human-approval shape generally — noting
one deliberate divergence worth flagging forward to Phase 6: GitHub
Actions treats a rejection as a hard workflow failure, whereas this
PRD's own Decisions Log ("Human-gate resume mechanism") routes a
rejection's feedback into the next visual fix round instead — a Phase
6 concern, not this phase's.

**Windows correctness (explicitly re-verified):** No task in this plan
adds a new CLI entry point or a new subprocess/shell-out. The two v1
defect classes (the `file://${process.argv[1]}` entry-guard mismatch;
`execFileAsync`/`npx` ENOENT) are structurally inapplicable to this
phase's `capture.mjs` changes — see the Risks table's last row.

**Self-application note:** this plan's own source PRD
(`figma-visual-first-track.prd.md`) does not declare `visual_first:
true`, and this target repo's own `docs/context/methodology.md`
declares no `figma_track` key at all — consistent with Phases 1-4's
own framing, this plan's `## Metadata` table carries no
`design_source` row and no `phase_scope` row; the new dual-mode
machinery this phase ships is inert against this repo and against this
very plan, by design.

---

*Generated: 2026-07-26*
*Approved: 2026-07-27*
*Implemented: 2026-07-27*
*Status: IMPLEMENTED*
