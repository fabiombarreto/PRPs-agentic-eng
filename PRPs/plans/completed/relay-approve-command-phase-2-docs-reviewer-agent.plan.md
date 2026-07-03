# Feature: Docs Reviewer agent (Phase 2 of relay-approve-command)

```
**Decision Gate**
- Active context: none
- Activated criteria: new agent file in plugins/relay/agents/ (cross-cutting artifact creation); writer/reviewer-pair component creation (the reviewer half of the Docs Updater/Reviewer pair); architectural decision (reviewer owns the manifest DRAFT→APPROVED flip; interactivity-boundary extension)
- Decisions found:
  - [2026-04-30] `plan-reviewer` owns the DRAFT→APPROVED flip + `.review.jsonl` verdict log (docs/decisions.md 2026-04-30 "Code-reviewer agent has no Edit tool" entry contrasts the two) — the Docs Reviewer mirrors plan-reviewer: it HAS `Edit` solely to perform the manifest two-line status flip
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repo root, never under `.claude/` — the Docs Reviewer's verdict log lands at `PRPs/reports/<feature>/docs-review.jsonl`; no `.claude/` write
  - [2026-05-18] Pillar 3 three-command split — `/relay-approve <pr>` dispatches the Docs Updater then the Docs Reviewer post-merge (docs/decisions.md 2026-05-18)
  - [2026-04-19] Command surface — one command per stage, writer/reviewer split; the reviewer validates the writer's artifact and owns the status flip
  - [2026-04-19] Methodology declaration lives in `docs/context/methodology.md` (single `tdd:` source of truth) — the relay repo is `tdd: false`, `test_frameworks: []`, so this phase's validation is filesystem/grep, not a test framework
- Applicable anti-patterns:
  - "Writing pipeline artifacts under `.claude/`" (docs/anti-patterns.md:60-66) — every path the agent writes (`docs-review.jsonl`, the manifest flip target) resolves under `PRPs/reports/<feature>/`, never `.claude/`
  - "Injecting plugin defaults into the target project's `decisions.md`" (docs/anti-patterns.md:51-56) — the Docs Reviewer's rubric has a dedicated item that FAILS the manifest if the Docs Updater injected a relay plugin default; the reviewer itself never edits `decisions.md`
  - "Treating `plugins/prp-core/` as active relay code" (docs/anti-patterns.md:70-75) — the agent prompt is adapted from relay's own `plan-reviewer`, never imported from prp-core
- Applicable architectural rules:
  - Interactivity boundary (PRD interactive, downstream autonomous) — the Docs Reviewer is a conscious, recorded extension: it MAY reopen dialogue with the operator post-merge, consistent with the Docs Updater (PRD Decisions Log; docs/decisions.md 2026-04-19 interactivity-boundary entry)
  - PRP artifacts under `PRPs/` at the repo root (docs/context/architecture.md:96-111)
  - Writer/reviewer split for agent pairs; reviewer owns the status flip (docs/context/architecture.md:121-126)
  - Reviewer read-only-except-its-own-log discipline: the reviewer reads the knowledge base but its only writes are the `.jsonl` log + the two-line manifest flip (mirrors plan-reviewer hard constraints 5-8)
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/relay-approve-command.prd.md` — Implementation Phases row 2:
  "Docs Reviewer agent" — Goal: A reviewer agent that validates the Docs
  Updater's edits and owns the manifest status flip. — Success signal: Given
  a `DRAFT` manifest, emits `APPROVED` (flip + log) on a clean update and
  `CHANGES_REQUESTED` (with IDs, no flip) on a seeded violation.

## Summary

This phase delivers a single new agent prompt file,
`plugins/relay/agents/docs-reviewer.md` — a deterministic-pipeline REVIEWER
agent that the future `/relay-approve` command (Phase 3) will dispatch
post-merge, immediately after the Docs Updater (Phase 1) runs. Given the
docs-update manifest at `PRPs/reports/<feature>/docs-update.md` (status
`DRAFT`) and `target_root`, the agent re-derives the merged diff
(`gh pr diff <pr>`) to cross-check the manifest's claims, runs a rubric of
concrete observable checks (named `D-R1`..`D-R8`) against the manifest and
the Docs Updater's surgical edits to the `docs/` knowledge base, appends a
verdict object to `PRPs/reports/<feature>/docs-review.jsonl` (append-only,
one JSON object per line, all rubric outcomes recorded — no short-circuit),
and emits one of exactly two verdicts: `APPROVED` or `CHANGES_REQUESTED`. On
`APPROVED` it OWNS the manifest DRAFT→APPROVED flip via a two-line `Edit`
(insert `*Approved: <YYYY-MM-DD>*` above `*Status: DRAFT*` and change it to
`*Status: APPROVED*`) — exactly as `plan-reviewer` owns the plan flip. On
`CHANGES_REQUESTED` it does NOT flip and returns the failing rubric item IDs
+ reasons. It MAY reopen dialogue with the operator (a conscious, recorded
extension of the interactivity boundary, consistent with the Docs Updater).
The approach mirrors the proven `plan-reviewer` shape (frontmatter with
`Edit` for the flip, rubric array, no-short-circuit jsonl log, two-line
status-flip `Edit`, hard constraints, anti-patterns) and consciously
diverges from `post-green-reviewer` (which has no flip) for the flip
behavior, so it composes cleanly with the existing pipeline and is auditable
end-to-end.

## User Story

As a relay operator closing out a merged feature,
I want a Docs Reviewer agent that validates the Docs Updater's manifest and
surgical edits against a concrete rubric, flips the manifest to APPROVED only
when every check passes, and logs every verdict,
So that my post-merge knowledge-base sync is trustworthy and auditable — no
fabricated decisions, no clobbered human-validated content, no `.claude/`
writes — without my having to hand-verify the Docs Updater's work.

## Problem Statement

The relay Pillar 3 docs cycle has a writer (the Docs Updater, shipped in
Phase 1) that produces a `DRAFT` manifest plus surgical edits to the `docs/`
knowledge base, but no reviewer to validate that work or to flip the manifest
to its approved state. Without the reviewer, the manifest stays `DRAFT`
forever (the writer is forbidden from flipping its own status), and there is
no automated check that the Docs Updater respected PRESERVE-ENTIRELY, did not
fabricate decisions into `decisions.md`, did not inject relay plugin
defaults, did not write under `.claude/`, and did not touch the
`documentation/` HTML site. This phase addresses exactly the second half of
the docs cycle: the REVIEWER agent that validates the manifest + edits
against a rubric and owns the DRAFT→APPROVED flip. (The `/relay-approve`
command that dispatches the pair, the `settings-allowlist.md` entries, and
the governance/docs-site/release cut are out of scope here — Phases 3 and 4
respectively.)

## Solution Statement

Ship `plugins/relay/agents/docs-reviewer.md` as a markdown file with YAML
frontmatter, structured like relay's `plan-reviewer` (the reviewer that owns
a status flip). Frontmatter declares `name: docs-reviewer`, a `description`
encapsulating the contract (validates the Docs Updater's manifest + edits
against a rubric; emits `APPROVED`/`CHANGES_REQUESTED`; appends
`docs-review.jsonl`; owns the manifest DRAFT→APPROVED flip), `model: sonnet`,
a `color` not already used by a sibling, and a `tools` allowlist of
`Read, Edit, Write, Glob, Grep, Bash` — `Edit` solely for the two-line
manifest flip (mirroring plan-reviewer), `Write` solely for the
`docs-review.jsonl` log, `Bash` solely to re-derive `gh pr diff <pr>` for
cross-checking the manifest's claims, `Read`/`Glob`/`Grep` for inspecting the
manifest and the knowledge base. The prompt body codifies: the inputs it
receives from `/relay-approve` (the merged PR number, `target_root`); how it
locates `feature` from `PRPs/reports/<feature>/orchestrator-run.json` and the
manifest at `PRPs/reports/<feature>/docs-update.md`; the rubric of eight
concrete observable checks (`D-R1`..`D-R8`, defined in the Acceptance
Criteria and Notes below); the no-short-circuit discipline (every rubric item
evaluated and logged every run); the verdict branch (APPROVED → flip + log;
CHANGES_REQUESTED → log + bullet list of failing IDs + reasons, no flip); the
two-line status-flip `Edit` with exact-match strings; its hard exclusions
(never write under `.claude/`; never itself edit the `docs/` knowledge base
or `decisions.md`; never touch the `documentation/` HTML site; never emit a
verdict other than APPROVED/CHANGES_REQUESTED); and the handoff confirmation.
The agent carries no capability to mutate the knowledge base — its only
writes are the jsonl log and the manifest's two-line flip.

## Metadata

| Key | Value |
|-----|-------|
| Type | New agent prompt file (markdown + YAML frontmatter) |
| Complexity | Medium — prompt authoring; no application code; heavy constraint surface (rubric definition, the DRAFT→APPROVED flip mechanics, PRESERVE/fabrication/`.claude/` reviewer checks) |
| Systems Affected | `plugins/relay/agents/` (new file); `documentation/changelog.html` (Unreleased "Added" entry — registry consistency); consumed later by Phase 3 `/relay-approve`; validates the Phase 1 Docs Updater's manifest |
| Dependencies | PRD row 2 `Depends` = `1` (Docs Updater agent, now `complete`); the future `/relay-approve` command (Phase 3) depends on this, not vice versa |
| Estimated Tasks | 5 |
| Source PRD line ref | `PRPs/prds/relay-approve-command.prd.md` Implementation Phases row 2 (line 190); Phase Details lines 201-204; behavioral contract AC-7 (line 73) + AC-9 (line 75) |
| phase_type | docs |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| 1 | `plugins/relay/agents/plan-reviewer.md` | 1-7, 52-93 | Canonical reviewer-WITH-flip shape: frontmatter (`tools: Read, Edit, Write`), the hard constraints (no-short-circuit, re-validate before flip, two-line `Edit` flip, no `.claude/` writes, `Write` only for jsonl) — the Docs Reviewer mirrors all of this |
| 1 | `plugins/relay/agents/plan-reviewer.md` | 607-665, 700-751 | The two-line DRAFT→APPROVED `Edit` flip mechanics (Step 4, Write-jsonl-before-Edit ordering) and the exact `.review.jsonl` object shape (`timestamp`, `verdict`, `rubric[]` of `{id,passed,reason?}`, `action`, `user_message`) the Docs Reviewer's `docs-review.jsonl` follows |
| 1 | `plugins/relay/agents/docs-updater.md` | 122-132, 229-265 | The manifest the Docs Reviewer validates: its `*Status: DRAFT*` trailing block and the full manifest schema (`## Files Edited` with per-file `**Change type:**`/`**Rationale:**`, `## Candidate Decisions`, `## Files Scanned — No Edit Required`) — the rubric checks each structural element |
| 1 | `plugins/relay/agents/docs-updater.md` | 54-132 | The Docs Updater's hard constraints (PRESERVE-ENTIRELY; no `.claude/`; no plugin-default injection; never touch `documentation/`; DRAFT-only status) — every rubric item maps to one of these constraints as a checkable claim |
| 2 | `plugins/relay/agents/post-green-reviewer.md` | 1-6 | The contrast reviewer that has NO status flip and emits a verdict-only block — establishes by contrast why the Docs Reviewer DOES have `Edit` (it owns a flip, like plan-reviewer, unlike post-green-reviewer) |
| 2 | `docs/context/code-review-registries.md` | 1-11 | The registry rule: a new agent file under `plugins/relay/agents/` must (a) be referenced by a command, (b) have an `agents.html` section, (c) add a `changelog.html` Unreleased entry — explains why this plan lists `documentation/changelog.html` in Files to Change (the lever available at Phase 2 scope; the command + `agents.html` land in Phases 3/4) |
| 2 | `PRPs/prds/relay-approve-command.prd.md` | 73, 75, 201-204, 167-170 | AC-7 (flip + log + CHANGES_REQUESTED-no-flip) and AC-9 (no `.claude/`, no plugin-default injection — dedicated rubric items), Phase 2 Details, and the Architecture Notes describing the Docs Reviewer's tools + scope |
| 3 | `PRPs/plans/completed/relay-approve-command-phase-1-docs-updater-agent.plan.md` | 124-200, 278-336 | The sibling Phase 1 plan: its Patterns-to-Mirror anchors and PowerShell/bash validation style, the `phase_type: docs` rationale, and the `.claude/` `-CaseSensitive` lesson this plan reuses |

## Patterns to Mirror

# SOURCE: plugins/relay/agents/plan-reviewer.md:1-7
```
---
name: plan-reviewer
description: Validate a DRAFT plan against an 8-item structural rubric (R1–R8) plus the additive R-COH-* coherence layer, derived from PRPs/prds/plan-authoring.prd.md AC-3, AC-4, AC-9, AC-10 and the 2026-04-28 docs/decisions.md entry. Auto-flip DRAFT→APPROVED on rubric pass — no user dialogue (interactivity boundary). Emit CHANGES_REQUESTED bullet list on any failure. Append every verdict to PRPs/plans/<basename>.review.jsonl with all 8 R1–R8 outcomes plus zero or more R-COH-* outcomes (no short-circuit on R1–R8). Owns the DRAFT→APPROVED status flip for plans. With description-mode R8 variant (R8a/R8b/R8c → passed:true + rationale when no source PRD; ≥3 AC-Ai items enforced via R8-desc-min-ac check).
model: sonnet
color: cyan
tools: Read, Edit, Write
---
```
Mirrored by Task 1 (frontmatter block). The Docs Reviewer keeps the
reviewer-with-flip frontmatter shape (name, description encapsulating the
verdict contract + flip ownership + jsonl log, model, color, tools). It adds
`Glob, Grep, Bash` to the `Read, Edit, Write` set — `Bash` solely for
`gh pr diff <pr>` cross-checking (the PRD Architecture Notes and the dispatch
contract specify Bash for this), yielding
`tools: Read, Edit, Write, Glob, Grep, Bash`. The description names the
manifest it validates (`docs-update.md`), the log it appends
(`docs-review.jsonl`), and the flip it owns.

# SOURCE: plugins/relay/agents/plan-reviewer.md:79-92
```
5. **Every verdict logs to `PRPs/plans/<basename>.review.jsonl`.**
   One JSON object per line, appended. Never truncate.
6. **Status flip is a two-line `Edit`** with exact-match strings:
   - `old_string`: `*Status: DRAFT*`
   - `new_string`: `*Approved: <YYYY-MM-DD>*\n*Status: APPROVED*`
   where `<YYYY-MM-DD>` is today's date (UTC). Use `Edit` to
   preserve the rest of the file byte-for-byte.
7. **No `.claude/` writes.** All paths resolve under
   `<target_root>/PRPs/plans/`. The string `.claude/PRPs/` MUST
   NOT appear in any path passed to `Write` or `Edit`. R6 mirrors
   this prohibition for the plan body.
8. **Use `Edit` for surgical changes; `Write` only for the jsonl
   log.** The plan file itself is touched only by the two-line
   status flip in Step 4. Wholesale rewrites are forbidden.
```
Mirrored by Task 2 (hard-constraints block). The Docs Reviewer's variant:
every verdict logs to `PRPs/reports/<feature>/docs-review.jsonl` (append-only,
never truncate); the status flip is the SAME two-line `Edit`
(`old_string: *Status: DRAFT*`; `new_string: *Approved: <YYYY-MM-DD>*\n*Status: APPROVED*`)
but applied to the MANIFEST at `PRPs/reports/<feature>/docs-update.md`; no
`.claude/` writes (the string `.claude/PRPs/` MUST NOT appear in any
`Write`/`Edit` path); `Edit` is used only for the manifest flip and `Write`
only for the jsonl log — the agent never edits the `docs/` knowledge base or
`decisions.md` itself.

# SOURCE: plugins/relay/agents/plan-reviewer.md:607-646
```
### Step 4 — Auto-flip (happy path, autonomous)

No user dialogue.

**Operation order matters.** The jsonl write happens BEFORE the
plan flip `Edit`. ...

2. **Append the APPROVED jsonl entry FIRST** (before the plan
   flip): ...

3. **Re-`Read` the plan one more time** (between Step 2's `Write`
   and Step 4's `Edit`) to refresh the harness's read cache. Then
   use `Edit` to flip the status:
   - `file_path`: `<draft_path>`
   - `old_string`: `*Status: DRAFT*`
   - `new_string`: `*Approved: <YYYY-MM-DD>*\n*Status: APPROVED*`
   - `replace_all`: `false`
```
Mirrored by Task 3 (verdict-branch + flip procedure). The Docs Reviewer's
APPROVED branch follows the same Write-jsonl-first, re-Read-then-Edit ordering
to keep the harness read cache warm before the manifest flip `Edit`, with
`file_path` = the manifest path, `replace_all: false`. The CHANGES_REQUESTED
branch appends the jsonl entry (all rubric items recorded), emits a bullet
list of failing IDs + reasons, and does NOT flip — terminal for the run.

# SOURCE: plugins/relay/agents/plan-reviewer.md:706-728
```
{
  "timestamp": "2026-04-25T19:33:00Z",
  "verdict": "APPROVED",
  "rubric": [
    { "id": "R1", "passed": true },
    ...
    { "id": "R8", "passed": true },
    ...
  ],
  "action": "final_flip",
  "user_message": ""
}
```
Mirrored by Task 2/Task 3 (jsonl format). The Docs Reviewer's
`docs-review.jsonl` object has the identical shape — `timestamp` (ISO-8601 Z),
`verdict` (`APPROVED` | `CHANGES_REQUESTED`), `rubric[]` of
`{id, passed, reason?}` with one row per `D-R1`..`D-R8` (no short-circuit;
`reason` required on `passed:false`), `action` (`final_flip` | `rubric_fail`),
and `user_message`. The `id` values are the docs rubric IDs `D-R1`..`D-R8`
rather than `R1`..`R8`.

# SOURCE: plugins/relay/agents/docs-updater.md:229-265
```
# Docs Update — <feature>

**PR:** <pr>
**Merged at:** <YYYY-MM-DD>
**Source PRD:** <prd_path>

## Files Edited

### `<path/to/file.md>`

**Change type:** additive | structural | index-update
**Rationale:** ...

## Candidate Decisions (for operator review)
...
## Files Scanned — No Edit Required
...
*Generated: <YYYY-MM-DD>*
*Status: DRAFT*
```
Mirrored by Task 3 (rubric definition — manifest well-formedness, `D-R8`).
The Docs Reviewer parses this exact manifest schema: it verifies the manifest
enumerates each touched file with a `**Change type:**` + `**Rationale:**`,
carries the `## Candidate Decisions` and `## Files Scanned` sections, and ends
with `*Status: DRAFT*` before the flip. The rubric's per-file checks
(`D-R1` traceability, `D-R2` PRESERVE) iterate the `## Files Edited`
subsections.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/agents/docs-reviewer.md` | CREATE | The Phase 2 deliverable — the new Docs Reviewer reviewer-agent prompt file |
| `documentation/changelog.html` | UPDATE | Add one `<li>` under the existing `Unreleased` → `Added` `<ul>` (after the Phase 1 `docs-updater.md` item) recording the new `docs-reviewer.md` agent. Required by `docs/context/code-review-registries.md` so the `code-reviewer` `R-COH-REGISTRY-MISSING` check passes on the first `/relay-implement` attempt (the command-reference + `agents.html` registrations land in Phases 3/4) |

## NOT Building (Scope Limits)

- **The `/relay-approve` command** (`plugins/relay/commands/relay-approve.md`) that dispatches the Docs Updater → Docs Reviewer pair, plus the `docs/context/settings-allowlist.md` entries — Phase 3.
- **Governance + docs-site + release cut** — the `docs/decisions.md` entry recording the Docs Reviewer design + interactivity-boundary extension, `docs/api-reference.md`, `docs/context/architecture.md`, the `documentation/reference/agents.html` section for both new agents, `documentation/roadmap/status.html`, and the `plugin.json` version bump — Phase 4. (This plan adds ONLY the `documentation/changelog.html` Unreleased "Added" line, not a version cut.)
- **The Docs Updater agent itself** — shipped in Phase 1 (`plugins/relay/agents/docs-updater.md`, row 1 `complete`); this phase only consumes/validates its manifest.
- **The merge, branch/worktree cleanup, and docs commit+push** — deterministic command responsibilities in Phase 3, not the reviewer's.
- **A retry/convergence loop between the Docs Updater and Docs Reviewer** (`max_docs_review_retries`) — a PRD Should-item wired at the command layer in Phase 3; the reviewer itself is single-shot and terminal (mirrors plan-reviewer "this agent does NOT loop").
- **The Docs Reviewer itself editing the `docs/` knowledge base or `decisions.md`** — explicitly forbidden forever; the reviewer's only writes are the `docs-review.jsonl` log and the manifest's two-line flip. Editing the knowledge base is the Docs Updater's job (Phase 1).
- **Syncing the `documentation/` HTML site as a runtime behavior of the agent** — the agent's rubric includes a check that the Docs Updater did NOT touch `documentation/`; the agent never writes there itself.

## Step-by-Step Tasks

### Task 1: CREATE `plugins/relay/agents/docs-reviewer.md` — frontmatter + role + inputs

- **Satisfies:** AC-A1, AC-A6
- **ACTION**: Create the file. Write the YAML frontmatter: `name: docs-reviewer`; a `description` encapsulating the contract (validates the Docs Updater's `docs-update.md` manifest + its surgical `docs/` edits against a rubric; emits `APPROVED`/`CHANGES_REQUESTED` and nothing else; appends every verdict to `PRPs/reports/<feature>/docs-review.jsonl` with all rubric outcomes recorded — no short-circuit; owns the manifest DRAFT→APPROVED flip; dispatched post-merge by the future `/relay-approve` command); `model: sonnet`; a `color` not already used by a sibling reviewer/writer (prd-writer `blue`, plan-writer `orange`, plan-reviewer `cyan`, post-green-reviewer `green`, docs-updater `lime` — e.g. `magenta` or `purple`); and `tools: Read, Edit, Write, Glob, Grep, Bash`. Then write the opening role paragraph (a deterministic-pipeline REVIEWER dispatched by the future `/relay-approve` command after the Docs Updater runs; the reviewer half of the writer/reviewer pair; mirrors `plan-reviewer`, contrasts `post-green-reviewer`) and an `## Inputs` section documenting what the command passes: the merged PR number/URL and `target_root`; and how the agent derives `feature` from `PRPs/reports/<feature>/orchestrator-run.json` and locates the manifest at `PRPs/reports/<feature>/docs-update.md`.
- **MIRROR**: `# SOURCE: plugins/relay/agents/plan-reviewer.md:1-7` (reviewer-with-flip frontmatter shape).
- **VALIDATE**:
  ```powershell
  Test-Path C:\repos\PRPs-agentic-eng\plugins\relay\agents\docs-reviewer.md
  ```
  _(bash: `test -f plugins/relay/agents/docs-reviewer.md`)_

### Task 2: WRITE the hard-constraints block + the D-R1..D-R8 rubric definition

- **Satisfies:** AC-A2, AC-A3, AC-A4
- **ACTION**: Add the hard-constraints block to `docs-reviewer.md`: (a) the agent emits EXACTLY one of `APPROVED` or `CHANGES_REQUESTED` — never any other verdict string. (b) No short-circuit — every `D-R1`..`D-R8` item is evaluated and recorded in the jsonl every run, regardless of earlier failures. (c) Every verdict logs to `PRPs/reports/<feature>/docs-review.jsonl` (append-only, one JSON object per line, never truncate). (d) The status flip is a two-line `Edit` on the MANIFEST (`old_string: *Status: DRAFT*`; `new_string: *Approved: <YYYY-MM-DD>*\n*Status: APPROVED*`; `replace_all: false`); the agent owns this flip and performs it ONLY on `APPROVED`. (e) No `.claude/` writes — the string `.claude/PRPs/` MUST NOT appear in any `Write`/`Edit` path; cite `docs/anti-patterns.md` lines 60-66. (f) `Edit` is used ONLY for the manifest flip; `Write` ONLY for the jsonl log; the agent NEVER edits the `docs/` knowledge base, `decisions.md`, or any file the Docs Updater touched, and NEVER touches the `documentation/` HTML site. Then add the rubric section defining the eight concrete observable checks `D-R1`..`D-R8` (full text in the Acceptance Criteria + Notes below): D-R1 manifest-claims-traceable-to-the-merged-diff; D-R2 PRESERVE-ENTIRELY respected; D-R3 no fabricated decisions written into `decisions.md`; D-R4 no relay plugin-default injection; D-R5 no writes under `.claude/`; D-R6 `documentation/` HTML site untouched; D-R7 `docs/KNOWLEDGE_BASE.md` index consistency when new `docs/` files were added; D-R8 manifest well-formedness (enumerates touched files + per-file rationale, ends `*Status: DRAFT*` before the flip).
- **MIRROR**: `# SOURCE: plugins/relay/agents/plan-reviewer.md:79-92` (hard-constraints: jsonl log, two-line `Edit` flip, no-`.claude/`, `Edit`-vs-`Write` scope) and `# SOURCE: plugins/relay/agents/docs-updater.md:229-265` (the manifest schema the D-R8 check parses).
- **VALIDATE**:
  ```powershell
  $f = 'C:\repos\PRPs-agentic-eng\plugins\relay\agents\docs-reviewer.md'
  $required = @('CHANGES_REQUESTED', 'APPROVED', 'docs-review.jsonl',
                '*Status: DRAFT*', '*Status: APPROVED*', 'PRESERVE',
                '.claude/', 'D-R1', 'D-R8')
  $missing = $required | Where-Object { -not (Select-String -Path $f -SimpleMatch $_ -Quiet) }
  if ($missing) { throw "docs-reviewer.md missing invariants: $($missing -join ', ')" }
  "Task 2 OK"
  ```
  _(bash: `for s in CHANGES_REQUESTED APPROVED docs-review.jsonl '*Status: DRAFT*' '*Status: APPROVED*' PRESERVE '.claude/' D-R1 D-R8; do grep -qF -- "$s" plugins/relay/agents/docs-reviewer.md || { echo "missing $s"; exit 1; }; done`)_

### Task 3: WRITE the protocol — grounding, rubric run, verdict branch, the two-line flip, and handoff

- **Satisfies:** AC-A1, AC-A4, AC-A5
- **ACTION**: Add the protocol body: (a) Step 1 grounding — read `orchestrator-run.json` for `feature`, read the manifest at `PRPs/reports/<feature>/docs-update.md`, run `gh pr diff <pr>` via Bash to cross-check the manifest's per-file claims against the actual merged diff, and read the `docs/` files the manifest claims to have edited. (b) Step 2 rubric run — walk `D-R1`..`D-R8` in order, recording `{id, passed, reason?}` for each (no short-circuit). (c) Step 3 verdict branch: on any `passed:false` → `CHANGES_REQUESTED` (append the jsonl entry with all rubric outcomes + `action: "rubric_fail"`, emit a bullet list naming each failing `D-R<i>` ID + reason, do NOT flip the manifest, exit — terminal); on all-pass → `APPROVED`: append the jsonl entry FIRST (`action: "final_flip"`, all items `passed:true`), then re-`Read` the manifest to warm the cache, then `Edit` the manifest's two-line status block (DRAFT→APPROVED), then emit the success summary. (d) The jsonl object shape (matching plan-reviewer: `timestamp`, `verdict`, `rubric[]`, `action`, `user_message`) and the append-only discipline (Read existing or empty, concatenate + newline + new line, Write back). (e) An interactivity clause — the agent MAY ask the operator a single focused question when a manifest claim is genuinely ambiguous (a conscious, recorded extension of the downstream-autonomous rule, consistent with the Docs Updater). (f) The handoff confirmation naming the verdict, the manifest path, and the next step, with "do not emit anything after this line."
- **MIRROR**: `# SOURCE: plugins/relay/agents/plan-reviewer.md:607-646` (Write-jsonl-first, re-Read-then-Edit flip ordering) and `# SOURCE: plugins/relay/agents/plan-reviewer.md:706-728` (jsonl object shape).
- **VALIDATE**:
  ```powershell
  $f = 'C:\repos\PRPs-agentic-eng\plugins\relay\agents\docs-reviewer.md'
  $ok = (Select-String -Path $f -SimpleMatch 'gh pr diff' -Quiet) -and `
        (Select-String -Path $f -SimpleMatch 'PRPs/reports/' -Quiet) -and `
        (Select-String -Path $f -SimpleMatch 'docs-update.md' -Quiet) -and `
        (Select-String -Path $f -SimpleMatch 'rubric_fail' -Quiet) -and `
        (Select-String -Path $f -SimpleMatch 'final_flip' -Quiet)
  if (-not $ok) { throw 'docs-reviewer.md missing a protocol marker (gh pr diff / PRPs/reports/ / docs-update.md / rubric_fail / final_flip)' }
  "Task 3 OK"
  ```
  _(bash: `for s in 'gh pr diff' 'PRPs/reports/' 'docs-update.md' rubric_fail final_flip; do grep -qF -- "$s" plugins/relay/agents/docs-reviewer.md || { echo "missing $s"; exit 1; }; done`)_

### Task 4: VERIFY frontmatter validity, the flip-only-on-APPROVED invariant, and no `.claude/` write path

- **Satisfies:** AC-A4, AC-A5, AC-A6
- **ACTION**: Re-read the finished file. Confirm: the YAML frontmatter parses (delimited by `---` on line 1 and a closing `---`); `tools:` lists exactly `Read, Edit, Write, Glob, Grep, Bash`; the body instructs the manifest flip to `*Status: APPROVED*` ONLY inside the APPROVED branch (i.e. the flip is conditional on rubric pass, never unconditional, and never on CHANGES_REQUESTED); and no `Write`/`Edit` target path under `.claude/` is described (the only `.claude/` mentions must be quoted prohibition references). The negative `.claude/` check uses `-CaseSensitive` so it matches the tool-call pattern `(Write|Edit) ... .claude/` and not lowercase prohibition prose. Fix any gap before declaring complete.
- **MIRROR**: `# SOURCE: plugins/relay/agents/plan-reviewer.md:52-93` (the hard-constraints contract — flip gated by rubric pass; `Edit` only for the flip; no `.claude/` writes).
- **VALIDATE**:
  ```powershell
  $f = 'C:\repos\PRPs-agentic-eng\plugins\relay\agents\docs-reviewer.md'
  $lines = Get-Content $f
  $fmOpen = ($lines[0] -eq '---')
  $fmClose = ($lines[1..($lines.Count-1)] | Select-String -SimpleMatch '---' | Select-Object -First 1) -ne $null
  $toolsOk = (Select-String -Path $f -Pattern '^tools:\s*Read,\s*Edit,\s*Write,\s*Glob,\s*Grep,\s*Bash\s*$' -Quiet)
  # No Write/Edit target under .claude/ (case-sensitive so lowercase prohibition prose does not match)
  $badWrite = Select-String -Path $f -Pattern '(Write|Edit).*\.claude/' -CaseSensitive -Quiet
  if (-not ($fmOpen -and $fmClose -and $toolsOk) -or $badWrite) {
    throw "docs-reviewer.md failed frontmatter/tools/no-.claude-write verification"
  }
  "Task 4 OK"
  ```
  _(bash: `head -1 plugins/relay/agents/docs-reviewer.md | grep -qx -- '---' && grep -qE '^tools:[[:space:]]*Read, Edit, Write, Glob, Grep, Bash[[:space:]]*$' plugins/relay/agents/docs-reviewer.md && ! grep -qE '(Write|Edit).*\.claude/' plugins/relay/agents/docs-reviewer.md`)_

### Task 5: UPDATE `documentation/changelog.html` — add the Unreleased "Added" entry for the new agent

- **Satisfies:** AC-A7
- **ACTION**: Edit `documentation/changelog.html`. Inside the existing `Unreleased` → `Added` `<ul>` (the `<h3 id="unreleased-added">Added</h3>` block, currently containing the single `docs-updater.md` `<li>`), append one sibling `<li>` immediately after the `docs-updater.md` item, recording the new `plugins/relay/agents/docs-reviewer.md` agent: a one-paragraph description naming it as the Pillar 3 REVIEWER agent (Phase 2 of the `relay-approve-command` feature) that validates the Docs Updater's `docs-update.md` manifest + surgical `docs/` edits against a rubric, appends verdicts to `PRPs/reports/<feature>/docs-review.jsonl`, and owns the manifest DRAFT→APPROVED flip; emits only `APPROVED`/`CHANGES_REQUESTED`; tools `Read, Edit, Write, Glob, Grep, Bash`; the version cut lands in Phase 4. Do NOT cut a version (no `plugin.json` bump here — that is Phase 4) and do NOT add/rename/remove any page (so the three-file NAV/search-index rule is not triggered — this is a content-only append to an existing page).
- **MIRROR**: `# SOURCE: plugins/relay/agents/docs-updater.md:229-265` is not the mirror here; the mirror is the existing Phase 1 `docs-updater.md` `<li>` already in the Unreleased "Added" block of `documentation/changelog.html` (lines 33-36) — match its `<li><strong><code>...</code></strong> &mdash; ...</li>` shape verbatim.
- **VALIDATE**:
  ```powershell
  $f = 'C:\repos\PRPs-agentic-eng\documentation\changelog.html'
  $ok = (Select-String -Path $f -SimpleMatch 'plugins/relay/agents/docs-reviewer.md' -Quiet) -and `
        (Select-String -Path $f -SimpleMatch 'unreleased-added' -Quiet)
  if (-not $ok) { throw 'changelog.html missing the docs-reviewer.md Unreleased Added entry' }
  "Task 5 OK"
  ```
  _(bash: `grep -qF 'plugins/relay/agents/docs-reviewer.md' documentation/changelog.html && grep -qF 'unreleased-added' documentation/changelog.html`)_

## Validation Commands

This is a docs / agent-authoring phase. `docs/context/methodology.md` has
`tdd: false` and `test_frameworks: []` (the relay repo is markdown + JSON),
so validation is filesystem / content-invariant oriented — there is no test
framework to invoke. Commands are PowerShell (primary shell on this Windows
host); bash equivalents are noted inline.

**Level 1 — STATIC_ANALYSIS (frontmatter / file well-formedness)**
```powershell
# The agent file exists and its YAML frontmatter is delimited by --- ... ---
$f = 'C:\repos\PRPs-agentic-eng\plugins\relay\agents\docs-reviewer.md'
if (-not (Test-Path $f)) { throw "missing $f" }
$lines = Get-Content $f
if ($lines[0] -ne '---') { throw 'frontmatter does not open with ---' }
$close = ($lines[1..($lines.Count-1)] | Select-String -SimpleMatch '---' | Select-Object -First 1)
if ($null -eq $close) { throw 'frontmatter has no closing ---' }
Select-String -Path $f -Pattern '^(name|description|model|color|tools):' | ForEach-Object { $_.Line }
# changelog.html is still valid HTML-ish: the Unreleased Added block exists
$c = 'C:\repos\PRPs-agentic-eng\documentation\changelog.html'
if (-not (Select-String -Path $c -SimpleMatch 'unreleased-added' -Quiet)) { throw 'changelog Unreleased Added block missing' }
"Level 1 OK"
```
_(bash: `test -f plugins/relay/agents/docs-reviewer.md && head -1 plugins/relay/agents/docs-reviewer.md | grep -qx -- '---' && grep -nE '^(name|description|model|color|tools):' plugins/relay/agents/docs-reviewer.md && grep -qF 'unreleased-added' documentation/changelog.html`)_

**Level 2 — CONTENT_INVARIANTS (required sections, rubric IDs, constraints present)**
```powershell
$f = 'C:\repos\PRPs-agentic-eng\plugins\relay\agents\docs-reviewer.md'
$required = @('docs-reviewer', 'APPROVED', 'CHANGES_REQUESTED',
              'docs-review.jsonl', 'docs-update.md', '*Status: DRAFT*',
              '*Status: APPROVED*', 'PRESERVE', '.claude/', 'gh pr diff',
              'documentation/', 'decisions.md',
              'D-R1', 'D-R2', 'D-R3', 'D-R4', 'D-R5', 'D-R6', 'D-R7', 'D-R8')
$missing = $required | Where-Object { -not (Select-String -Path $f -SimpleMatch $_ -Quiet) }
if ($missing) { throw "docs-reviewer.md missing invariants: $($missing -join ', ')" }
"Level 2 OK"
```
_(bash: `for s in docs-reviewer APPROVED CHANGES_REQUESTED docs-review.jsonl docs-update.md '*Status: DRAFT*' '*Status: APPROVED*' PRESERVE '.claude/' 'gh pr diff' 'documentation/' decisions.md D-R1 D-R2 D-R3 D-R4 D-R5 D-R6 D-R7 D-R8; do grep -qF -- "$s" plugins/relay/agents/docs-reviewer.md || { echo "missing $s"; exit 1; }; done`)_

**Level 3 — INTEGRATION (reviewer-with-flip contract & no-`.claude/`-write consistency)**
```powershell
$f = 'C:\repos\PRPs-agentic-eng\plugins\relay\agents\docs-reviewer.md'
# tools allowlist matches the plan's contract exactly (Edit present for the flip, like plan-reviewer)
if (-not (Select-String -Path $f -Pattern '^tools:\s*Read,\s*Edit,\s*Write,\s*Glob,\s*Grep,\s*Bash\s*$' -Quiet)) {
  throw 'tools: allowlist does not match Read, Edit, Write, Glob, Grep, Bash'
}
# The agent owns a manifest flip (mirrors plan-reviewer, NOT post-green-reviewer): both DRAFT and APPROVED status lines are referenced
if (-not ((Select-String -Path $f -SimpleMatch '*Status: DRAFT*' -Quiet) -and (Select-String -Path $f -SimpleMatch '*Status: APPROVED*' -Quiet))) {
  throw 'docs-reviewer.md must reference both the DRAFT (old_string) and APPROVED (new_string) of the manifest flip'
}
# Every .claude/ mention is a prohibition reference, never a write target (case-sensitive so lowercase prose does not match)
$badWrite = Select-String -Path $f -Pattern '(Write|Edit).*\.claude/' -CaseSensitive -Quiet
if ($badWrite) { throw 'docs-reviewer.md appears to describe a Write/Edit under .claude/' }
"Level 3 OK — reviewer-with-flip contract intact, no .claude/ write target"
```
_(bash: `grep -qE '^tools:[[:space:]]*Read, Edit, Write, Glob, Grep, Bash[[:space:]]*$' plugins/relay/agents/docs-reviewer.md && grep -qF '*Status: DRAFT*' plugins/relay/agents/docs-reviewer.md && grep -qF '*Status: APPROVED*' plugins/relay/agents/docs-reviewer.md && ! grep -qE '(Write|Edit).*\.claude/' plugins/relay/agents/docs-reviewer.md`)_

## Acceptance Criteria

- **AC-A1 (PRD AC-7):** `plugins/relay/agents/docs-reviewer.md` exists and instructs the agent to validate the Docs Updater's manifest at `PRPs/reports/<feature>/docs-update.md` plus its surgical `docs/` edits against a rubric, then emit `APPROVED` (flip + log) or `CHANGES_REQUESTED` (failing IDs, no flip). (Level 1 + Level 2 verify existence, the manifest path, and both verdict tokens.)
- **AC-A2 (PRD AC-7, AC-9):** The agent prompt defines a rubric of concrete observable checks `D-R1`..`D-R8`: D-R1 every doc file the manifest claims to have edited reflects a real change traceable to the merged diff; D-R2 PRESERVE-ENTIRELY respected (no human-validated file — `decisions.md`, `anti-patterns.md`, `docs/context/*` — regenerated wholesale); D-R3 no fabricated decisions written into `decisions.md` (inferred decisions are manifest candidates, not direct writes); D-R4 no relay plugin-default injection into a target `decisions.md`; D-R5 no writes under `.claude/`; D-R6 the `documentation/` HTML site was NOT touched; D-R7 `docs/KNOWLEDGE_BASE.md` index consistency when new `docs/` files were added; D-R8 manifest well-formedness (enumerates touched files + per-file rationale, ends `*Status: DRAFT*` before the flip). (Level 2 verifies all eight `D-R<i>` IDs are present.)
- **AC-A3 (PRD AC-7):** The agent emits EXACTLY one of `APPROVED` or `CHANGES_REQUESTED` (never any other verdict string), evaluates and records every `D-R1`..`D-R8` outcome in `PRPs/reports/<feature>/docs-review.jsonl` every run (no short-circuit, append-only), and on `CHANGES_REQUESTED` returns the failing rubric item IDs + reasons without flipping the manifest. (Level 2 verifies both verdict tokens + the jsonl path; the prompt body enumerates the no-short-circuit + CHANGES_REQUESTED-no-flip rules.)
- **AC-A4 (PRD AC-7):** The agent OWNS the manifest DRAFT→APPROVED flip — a two-line `Edit` (`old_string: *Status: DRAFT*`; `new_string: *Approved: <YYYY-MM-DD>*\n*Status: APPROVED*`) performed ONLY inside the APPROVED branch (gated by full rubric pass, never on CHANGES_REQUESTED), mirroring `plan-reviewer` and contrasting `post-green-reviewer` (which has no flip). (Level 3 verifies both manifest status lines are referenced; Task 4 verifies the flip is conditional.)
- **AC-A5 (PRD AC-9):** The agent prompt forbids any write under `.claude/` (the string `.claude/PRPs/` MUST NOT appear in any `Write`/`Edit` path, citing `docs/anti-patterns.md` lines 60-66) and constrains the agent's only writes to the `docs-review.jsonl` log (`Write`) and the manifest two-line flip (`Edit`) — it never edits the `docs/` knowledge base, `decisions.md`, or the `documentation/` HTML site itself. (Level 3 verifies no `Write`/`Edit` target resolves under `.claude/`.)
- **AC-A6 (PRD AC-7):** The frontmatter declares `tools: Read, Edit, Write, Glob, Grep, Bash` (`Edit` for the flip — the divergence from `post-green-reviewer`; `Write` for the jsonl; `Bash` for `gh pr diff` cross-checking), matching the PRD Architecture Notes' suggested allowlist, and the YAML parses (delimited frontmatter). (Level 1 + Level 3 verify.)
- **AC-A7 (PRD AC-7):** `documentation/changelog.html` carries a new `<li>` under the `Unreleased` → `Added` `<ul>` recording the `docs-reviewer.md` agent, so the `code-reviewer` `R-COH-REGISTRY-MISSING` check (per `docs/context/code-review-registries.md`) passes on the first `/relay-implement` attempt. (Level 1 confirms the Unreleased Added block still exists; Task 5 VALIDATE confirms the new entry's presence.)

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| No existing `docs-reviewer` template — all reviewer patterns derived by analogy (research-codebase gap) | L | L | `plan-reviewer` is a near-exact structural template (reviewer-with-flip: frontmatter, no-short-circuit jsonl, two-line `Edit` flip, hard constraints); `post-green-reviewer` is the contrast (no flip). Both are cited in Mandatory Reading + Patterns to Mirror with real `file:line` anchors. The only net-new content is the docs-specific rubric (`D-R1`..`D-R8`), which is fully specified in this plan's Acceptance Criteria. |
| The `docs-review.jsonl` path convention is not specified in any existing file (research-codebase gap) | M | L | The PRD (AC-7) and Phase 2 Details fix the path as `PRPs/reports/<feature>/docs-review.jsonl` (alongside the manifest at `PRPs/reports/<feature>/docs-update.md` and `orchestrator-run.json`). This plan adopts that path verbatim; the agent derives `<feature>` from `orchestrator-run.json` exactly as the Docs Updater does. |
| New agent file under `plugins/relay/agents/` trips `code-reviewer` `R-COH-REGISTRY-MISSING` (no command reference, no `agents.html` section yet — both land in Phases 3/4) | M | M | Task 5 adds the `documentation/changelog.html` Unreleased "Added" entry — the registry lever available at Phase 2 scope (per `docs/context/code-review-registries.md`). The command-reference + `agents.html` registrations are correctly deferred to Phases 3/4; the changelog entry satisfies the changelog registry on the first implement attempt, mirroring the Phase 1 sibling's release-discipline handling. |
| The agent's `Edit` capability (for the flip) drifts into editing the knowledge base | L | H | Hard-constraints block (Task 2) restricts `Edit` to the manifest two-line flip and `Write` to the jsonl log only, with an explicit "never edits the `docs/` knowledge base or `decisions.md`" rule; Task 4 + Level 3 validation assert no `Write`/`Edit` path under `.claude/` and that both manifest status lines are referenced (flip target). The reviewer/writer split (reviewer validates, writer edits) is the load-bearing contract. |
| Manifest flip applied on CHANGES_REQUESTED (premature approval) | L | H | Task 3 places the flip strictly inside the APPROVED branch after the jsonl write; Task 4 verifies the flip is conditional on rubric pass; this mirrors plan-reviewer's gated flip (the flip is the last action of the happy path only). |
| research-web returned strongly-relevant external findings but no library/API contract | L | L | The web findings (claim-level enumeration before verdict; restrictive "flag only explicit contradictions" rubrics à la driftcheck; deterministic-checks-before-judge discipline; diff-level reviewers fail on out-of-scope context) reinforce the rubric design (D-R1 diff-traceability is claim-level; D-R2..D-R6 are deterministic/observable) and are reflected in the Notes; no action needed beyond noting them. |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.
  - For this docs/agent-authoring phase the practical consequence is that validation is filesystem / content-invariant (PowerShell `Test-Path` / `Select-String`; bash `test -f` / `grep`), not a test-framework invocation — consistent with `test_frameworks: []` and with every prior relay agent-authoring phase (including the Phase 1 sibling).

- **`phase_type: docs` rationale:** the deliverables are a documentation-class agent prompt (`plugins/relay/agents/docs-reviewer.md`, markdown) and a content-only edit to `documentation/changelog.html` — no application source. This `phase_type` is consumed by `plan-reviewer` Phase 0 and the `R-COH-VALIDATE-FRAMEWORK-MISMATCH` exemption branch, so the framework-mismatch check is correctly exempted here (the VALIDATE commands are filesystem/grep-oriented by design, not test-framework invocations).

- **The D-R1..D-R8 rubric (full reference for the implementer).** The agent prompt must define these eight checks as concrete, observable reviewer steps, each producing a `{id, passed, reason?}` row in `docs-review.jsonl`:
  - **D-R1 — Manifest claims are diff-traceable.** Every file listed under the manifest's `## Files Edited` reflects a real change traceable to a hunk in `gh pr diff <pr>` (or to the source PRD, for a PRD-stated edit). Re-derive the diff via Bash and cross-check. A manifest-claimed edit with no corresponding diff change fails.
  - **D-R2 — PRESERVE-ENTIRELY respected.** No human-validated file (`docs/decisions.md`, `docs/anti-patterns.md`, any `docs/context/*`) was regenerated wholesale; edits to those files are surgical/additive only (verifiable in `git diff` — bounded, contiguous additions, not a full-file rewrite).
  - **D-R3 — No fabricated decisions.** No inferred/ambiguous decision was written directly into `docs/decisions.md`; such decisions appear only in the manifest's `## Candidate Decisions` section (per the Docs Updater contract), not as direct `decisions.md` writes.
  - **D-R4 — No plugin-default injection.** No relay plugin default (`max_test_retries: 3`, the `tdd: false` default, the PRP root path, etc.) was injected into the target's `docs/decisions.md` (docs/anti-patterns.md:51-56).
  - **D-R5 — No `.claude/` writes.** No file under `.claude/` was created or edited by the Docs Updater (its manifest + edits all resolve under `docs/` or `PRPs/reports/<feature>/`).
  - **D-R6 — `documentation/` untouched.** The Docs Updater did NOT write to the `documentation/` HTML site (that site is owned by each feature's release-cut phase per `documentation/AGENTS.md`; the Docs Updater touches the `docs/` knowledge base only).
  - **D-R7 — KNOWLEDGE_BASE index consistency.** When the merged diff added new files under `docs/`, `docs/KNOWLEDGE_BASE.md` was updated to index them (or the manifest justifies why no index update was needed).
  - **D-R8 — Manifest well-formedness.** The manifest enumerates every touched file with a per-file `**Change type:**` + `**Rationale:**`, carries the `## Candidate Decisions` and `## Files Scanned — No Edit Required` sections, and ends with `*Status: DRAFT*` before the flip.
  - These IDs are deliberately namespaced `D-R*` (not `R*`) so the docs-review jsonl is distinguishable from plan-review / code-review logs. The set maps 1:1 onto the Docs Updater's hard constraints (PRESERVE, no-`.claude/`, no-plugin-default, never-touch-`documentation/`, DRAFT-status) plus the diff-traceability and KNOWLEDGE_BASE-index checks the PRD's Phase 2 Scope names.

- **Reviewer-with-flip vs reviewer-without-flip (the load-bearing design choice).** Per PRD D "Reviewer model" (line 227) the Docs Reviewer follows `plan-reviewer` (manifest DRAFT→APPROVED + `.jsonl`), NOT `post-green-reviewer` (lightweight verdict-only). The concrete consequence is the `Edit` tool in the allowlist and the two-line flip in the APPROVED branch. The dispatch contract and PRD both confirm `Edit` is present specifically for the flip — this is the single most important divergence from the no-flip reviewer.

- **Color choice:** Task 1 should pick a `color` not already used by a sibling (prd-writer `blue`, plan-writer `orange`, plan-reviewer `cyan`, post-green-reviewer `green`, docs-updater `lime`); `magenta` or `purple` is a safe default but the implementer may pick any unused value.

- **Interactivity-boundary extension:** like the Docs Updater, the Docs Reviewer is a post-merge agent that MAY reopen dialogue with the operator (one focused question) when a manifest claim is genuinely ambiguous. This is the same conscious, recorded extension of the "downstream autonomous" rule the Docs Updater carries; it diverges from `plan-reviewer`'s strict no-dialogue stance because the post-merge docs context sits past the original interactivity boundary and the PRD explicitly grants the pair this latitude. The formal `docs/decisions.md` entry recording this extension is Phase 4's responsibility, not this plan's.

- **Research grounding:** research-codebase returned 8 findings with real `file:line` anchors (all cited in Mandatory Reading + Patterns to Mirror) plus 5 gaps; the load-bearing gaps (no existing `docs-reviewer` template; the `docs-review.jsonl` path not pre-specified; whether the reviewer should auto-flip or operator-confirm) are captured in Risks and resolved against the PRD (path = `PRPs/reports/<feature>/docs-review.jsonl`; auto-flip on rubric pass with an optional one-question interactivity clause). research-web returned 8 directly-relevant industry findings (Autorubric atomic per-criterion verdicts; claim-level enumeration before scoring; driftcheck's restrictive "flag only explicit contradictions"; deterministic-checks-before-judge discipline; diff-level reviewers failing on out-of-scope context) that corroborate the rubric design; no degradation.

- **Dogfood opportunity:** once Phases 3-4 land, this very phase's merged PR is a natural real input for the shipped Docs Updater → Docs Reviewer pair.

*Generated: 2026-06-19*
*Approved: 2026-06-19*
*Status: IMPLEMENTED*
