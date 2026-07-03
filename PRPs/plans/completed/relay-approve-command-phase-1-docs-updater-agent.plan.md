# Feature: Docs Updater agent (Phase 1 of relay-approve-command)

```
**Decision Gate**
- Active context: none
- Activated criteria: new agent file in plugins/relay/agents/ (cross-cutting artifact creation); writer/reviewer-pair component creation; mirrors context-builder *update PRESERVE-ENTIRELY semantics
- Decisions found:
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repo root, never under `.claude/` — the Docs Updater is named explicitly among the affected agents; its manifest lands at `PRPs/reports/<feature>/docs-update.md`
  - [2026-04-30] `plan-reviewer` owns the DRAFT→APPROVED flip + `.review.jsonl` verdict log — the writer (Docs Updater) NEVER flips its own status; the Docs Reviewer (Phase 2) owns that
  - [2026-04-19] Command surface — one command per stage, writer/reviewer split; `/relay-approve <pr>` is the single remaining Pillar 3 placeholder that will dispatch this writer
  - [2026-05-18] Pillar 3 three-command split — `/relay-approve <pr>` runs the Docs Updater + Docs Reviewer post-merge
  - [2026-04-19] Methodology declaration lives in `docs/context/methodology.md` (single `tdd:` source of truth) — the Docs Updater must never inject this or any plugin default into a target's decisions.md
- Applicable anti-patterns:
  - "Writing pipeline artifacts under `.claude/`" (docs/anti-patterns.md:60-66; "Areas affected" names the Docs Updater) — every artifact the agent writes resolves under `PRPs/` or `docs/`, never `.claude/`
  - "Injecting plugin defaults into the target project's `decisions.md`" (docs/anti-patterns.md:51-56; "Areas affected" names the future Docs Updater) — the agent records only project-derived facts, never relay's own defaults (`max_test_retries: 3`, the `tdd: false` default, PRP root path)
  - "Treating `plugins/prp-core/` as active relay code" (docs/anti-patterns.md:70-75) — the agent prompt is adapted from relay's own writer agents, never imported from prp-core
- Applicable architectural rules:
  - Interactivity boundary (PRD interactive, downstream autonomous) — the Docs Updater is a conscious, recorded extension: it MAY reopen dialogue with the operator post-merge when a docs decision is ambiguous (PRD Decisions Log; docs/decisions.md 2026-04-19 interactivity-boundary entry)
  - PRP artifacts under `PRPs/` at the repo root (docs/context/architecture.md:96-111)
  - context-builder `*update` PRESERVE-ENTIRELY semantics (SKILL.md:1140-1143) — the Docs Updater mirrors them: never regenerate human-validated files; append / surgical-edit only
  - Writer/reviewer split for agent pairs; reviewer owns the status flip (docs/context/architecture.md:121-126)
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/relay-approve-command.prd.md` — Implementation Phases row 1:
  "Docs Updater agent" — Goal: A writer agent that, given a merged PR's diff
  + source PRD, produces a surgical, PRESERVE-aware update to the `docs/`
  knowledge base plus a `DRAFT` manifest. — Success signal: Run against a
  sample merged diff → manifest `DRAFT` enumerates touched files with
  rationale; no PRESERVE-ENTIRELY file regenerated; no `.claude/` write; no
  plugin-default injection.

## Summary

This phase delivers a single new agent prompt file,
`plugins/relay/agents/docs-updater.md` — a deterministic-pipeline WRITER
agent that the future `/relay-approve` command (Phase 3) will dispatch
post-merge. Given a merged PR number, the agent reads `gh pr diff <pr>`
(the merged diff) and the source PRD (located via the `prd_path` field of
`PRPs/reports/<feature>/orchestrator-run.json`), compares the change set
against the `docs/` knowledge base, and makes surgical, additive-only
updates that mirror the context-builder `*update` PRESERVE-ENTIRELY rules.
It then writes a docs-update manifest at
`PRPs/reports/<feature>/docs-update.md` ending with `*Status: DRAFT*`,
enumerating every touched file with a per-file rationale. The agent never
flips its own status to APPROVED (the Docs Reviewer, Phase 2, owns that),
never writes under `.claude/`, never injects relay plugin defaults into a
target project's `decisions.md`, and MAY reopen dialogue with the operator
when a docs decision is genuinely ambiguous. The approach mirrors the
proven `prd-writer` / `plan-writer` agent shape (frontmatter, hard
constraints, status-line discipline, handoff confirmation) so it composes
cleanly with the existing pipeline and is auditable end-to-end.

## User Story

As a relay operator closing out a merged feature,
I want a Docs Updater agent that diffs the merged change against my `docs/`
knowledge base and proposes surgical, additive updates plus a reviewable
manifest,
So that my knowledge base stays in sync with what shipped without manual
post-merge bookkeeping, and without ever clobbering content I validated by
hand.

## Problem Statement

The relay Pillar 3 lifecycle stops at `/relay-pr`: after a PR is merged,
the post-merge docs sync that `docs/decisions.md` and `docs/anti-patterns.md`
already promise (their "Atualizado pelo Docs Updater após cada aprovação"
headers) is skipped or done by hand, and the knowledge base drifts from the
code. There is no Docs Updater agent — only a placeholder. This phase
addresses exactly the first half of that gap: the WRITER agent that produces
the surgical docs update plus a DRAFT manifest. (The Docs Reviewer that
validates it, the `/relay-approve` command that dispatches it, and the
merge/cleanup plumbing are out of scope here — Phases 2, 3, and 4
respectively.)

## Solution Statement

Ship `plugins/relay/agents/docs-updater.md` as a markdown file with YAML
frontmatter, structured like relay's other writer agents. Frontmatter
declares `name: docs-updater`, a `description` ending with the
never-approves-its-own-output disclaimer, `model: sonnet`, a `color`, and a
`tools` allowlist of `Read, Write, Edit, Glob, Grep, Bash` (Bash solely for
`gh pr diff`). The prompt body codifies: the inputs it receives from
`/relay-approve` (the PR number, `target_root`); how it locates `prd_path`
and `feature` from `orchestrator-run.json`; the diff-driven comparison
against the `docs/` knowledge base; the PRESERVE-ENTIRELY rule it mirrors
from context-builder; its write scope (`docs/context/*`, `docs/domain/*`,
`docs/decisions.md`, `docs/anti-patterns.md`, `CLAUDE.md`,
`docs/KNOWLEDGE_BASE.md`, plus the manifest) and its hard exclusions (never
`.claude/`, never the `documentation/` HTML site, never plugin-default
injection); the manifest shape ending `*Status: DRAFT*`; and the handoff
confirmation that points at `/relay-approve`'s Docs Reviewer dispatch. The
agent carries no status-flip capability over its own manifest beyond writing
the initial DRAFT.

## Metadata

| Key | Value |
|-----|-------|
| Type | New agent prompt file (markdown + YAML frontmatter) |
| Complexity | Medium — prompt authoring; no application code; heavy constraint surface (PRESERVE, `.claude/`, plugin-default injection) |
| Systems Affected | `plugins/relay/agents/` (new file); consumed later by Phase 3 `/relay-approve` and Phase 2 Docs Reviewer |
| Dependencies | None (PRD row 1 `Depends` = `-`); the future `/relay-approve` command and Docs Reviewer depend on this, not vice versa |
| Estimated Tasks | 4 |
| Source PRD line ref | `PRPs/prds/relay-approve-command.prd.md` Implementation Phases row 1 (line 189); Phase Details lines 196-199 |
| phase_type | docs |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| 1 | `plugins/relay/agents/prd-writer.md` | 1-7 | Canonical writer-agent frontmatter shape (name, description-with-disclaimer, model, color, tools) to mirror |
| 1 | `plugins/relay/agents/plan-writer.md` | 1-7, 106-110 | Writer frontmatter + the exact `.claude/PRPs/` prohibition wording with its `docs/anti-patterns.md:60-66` citation |
| 1 | `plugins/relay/skills/context-builder/SKILL.md` | 1140-1143 | The byte-exact PRESERVE-ENTIRELY rule for `decisions.md` (and the analogous `docs/context/` / `anti-patterns.md` rules) the agent must mirror |
| 1 | `docs/anti-patterns.md` | 51-56, 60-66 | The two anti-patterns whose "Areas affected" name the Docs Updater explicitly: plugin-default injection + `.claude/` writes |
| 2 | `plugins/relay/agents/plan-reviewer.md` | 1-6 | The reviewer counterpart that owns the DRAFT→APPROVED flip + `.review.jsonl` — establishes the split the Docs Updater must respect (writer never flips) |
| 2 | `plugins/relay/commands/relay-execute.md` | 205-222 | `orchestrator-run.json` shape: `feature` + `prd_path` fields the agent reads to ground itself (note: `pr_url` is NOT in this shape — see Risks) |
| 2 | `PRPs/prds/relay-approve-command.prd.md` | 67-79, 196-199, 167-170 | AC-6 / AC-9 (the agent's behavioral contract), Phase 1 Details, and the Architecture Notes describing the Docs Updater's tools + scope |
| 3 | `docs/KNOWLEDGE_BASE.md` | whole | The index file the agent may need to keep consistent when docs are added |

## Patterns to Mirror

# SOURCE: plugins/relay/agents/prd-writer.md:1-7
```
---
name: prd-writer
description: Drive the interactive 6-phase PRD authoring flow with the user, invoke relay research subagents during GROUNDING, consult the Decision Gate sources, and write a DRAFT PRD conformant with ${CLAUDE_PLUGIN_ROOT}/docs/context/prd-template.md to PRPs/prds/<kebab>.prd.md. Invoked by the /relay-prd command. Never approves its own output — the prd-reviewer agent owns the DRAFT→APPROVED flip.
model: sonnet
color: blue
tools: Task, Read, Write, Edit, Glob
---
```
Mirrored by Task 1 (frontmatter block). The Docs Updater drops `Task`
(it dispatches no subagent) and adds `Grep` + `Bash` (for `gh pr diff`),
yielding `tools: Read, Write, Edit, Glob, Grep, Bash`. The
`description` keeps the trailing "Never approves its own output — the
docs-reviewer agent owns the DRAFT→APPROVED flip" disclaimer verbatim in
shape.

# SOURCE: plugins/relay/agents/plan-writer.md:106-110
```
8. **No `.claude/` writes.** Every artifact path you compute resolves
   under `<target_root>/PRPs/plans/` or `<target_root>/PRPs/prds/`
   (the latter only for the back-fill `Edit`). The string
   `.claude/PRPs/` MUST NOT appear in any path you pass to `Write`
   or `Edit`. This mirrors `docs/anti-patterns.md` lines 60–66 and
```
Mirrored by Task 2 (hard-constraints block). The Docs Updater's variant
resolves every path under `<target_root>/docs/` or
`<target_root>/PRPs/reports/<feature>/`, asserts `.claude/PRPs/` MUST NOT
appear in any `Write`/`Edit` path, and cites `docs/anti-patterns.md`
lines 60-66 identically.

# SOURCE: plugins/relay/skills/context-builder/SKILL.md:1140-1143
```
- **If the file exists and has at least one substantive entry** (not just
  the template/header): PRESERVE ENTIRELY. Do not add, modify, or
  re-infer. Report in the Final Report what new decisions the scan would
  have inferred — the team reviews and adds manually.
```
Mirrored by Task 2 (PRESERVE-ENTIRELY section). The Docs Updater applies
this rule to `docs/decisions.md`, `docs/anti-patterns.md`, and
`docs/context/*`: never regenerate a human-validated file wholesale;
make only surgical, additive edits, and where it would otherwise add a
decision, it records the candidate in the manifest for the operator
rather than writing it into `decisions.md` itself.

# SOURCE: plugins/relay/agents/plan-writer.md:643-651 (handoff confirmation shape)
```
> DRAFT plan written to `PRPs/plans/<feature>-phase-<N>-<slug>.plan.md`.
> Decision Gate: **{PROCEED | HALT}**.
> Source PRD row <N> marked `in-progress`.
> Run `/relay:relay-plan-review PRPs/plans/<feature>-phase-<N>-<slug>.plan.md` to validate.
```
Mirrored by Task 3 (handoff section). The Docs Updater emits a verbatim
terminal confirmation naming the manifest path
(`PRPs/reports/<feature>/docs-update.md`), the count of touched files,
and the next step (the Docs Reviewer dispatched by `/relay-approve`),
then stops — no output after that line.

# SOURCE: plugins/relay/commands/relay-execute.md:205-222 (orchestrator-run.json shape)
```
{
  "feature": "<feature>",
  "prd_path": "<prd_path>",
  "started_at": "<ISO timestamp>",
  "ended_at": "<ISO timestamp>",
  ...
  "outcome": "ALL_PHASES_COMPLETE",
  "phases_completed": <phases_completed>
}
```
Mirrored by Task 1/Task 2 (Inputs + grounding section). The Docs Updater
reads `feature` and `prd_path` from this JSON to locate the source PRD
and derive `<feature>` for its manifest path. NOTE the documented gap:
`pr_url` is absent from this shape, so the PR number must arrive as a
direct input from `/relay-approve <pr>` — captured in Risks.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/agents/docs-updater.md` | CREATE | The Phase 1 deliverable — the new Docs Updater writer-agent prompt file |

## NOT Building (Scope Limits)

- **The Docs Reviewer agent** (`plugins/relay/agents/docs-reviewer.md`) — Phase 2; it owns the manifest DRAFT→APPROVED flip and the `docs-review.jsonl` log.
- **The `/relay-approve` command** (`plugins/relay/commands/relay-approve.md`) and the `settings-allowlist.md` entries — Phase 3.
- **Governance + docs-site + release cut** (decisions.md entry, `docs/api-reference.md`, `documentation/` HTML, `plugin.json` bump) — Phase 4.
- **Syncing the `documentation/` HTML site** — explicitly out of scope for the Docs Updater forever (PRD "What We're NOT Building"); the site is owned by each feature's release-cut phase per `documentation/AGENTS.md`. The agent touches the `docs/` knowledge base only.
- **The merge, branch/worktree cleanup, and docs commit+push** — those are deterministic command responsibilities in Phase 3, not the agent's.
- **A bounded source-diff size cap** — registered as a PRD Open Question pending dogfood telemetry; not built here.

## Step-by-Step Tasks

### Task 1: CREATE `plugins/relay/agents/docs-updater.md` — frontmatter + role + inputs

- **Satisfies:** AC-A1, AC-A5
- **ACTION**: Create the file. Write the YAML frontmatter (`name: docs-updater`; a `description` ending "Never approves its own output — the docs-reviewer agent owns the DRAFT→APPROVED flip."; `model: sonnet`; `color:` a value not already used by a sibling writer — e.g. `green`; `tools: Read, Write, Edit, Glob, Grep, Bash`). Then write the opening role paragraph (deterministic-pipeline WRITER dispatched by the future `/relay-approve` command) and an `## Inputs` section documenting what the command passes: the merged PR number/URL, and `target_root`; and how the agent derives `feature` + `prd_path` by reading `PRPs/reports/<feature>/orchestrator-run.json`.
- **MIRROR**: `# SOURCE: plugins/relay/agents/prd-writer.md:1-7` (frontmatter shape) and `# SOURCE: plugins/relay/commands/relay-execute.md:205-222` (orchestrator-run.json fields).
- **VALIDATE**:
  ```powershell
  Test-Path C:\repos\PRPs-agentic-eng\plugins\relay\agents\docs-updater.md
  ```

### Task 2: WRITE the hard-constraints + PRESERVE-ENTIRELY + write-scope body

- **Satisfies:** AC-A2, AC-A3
- **ACTION**: Add the hard-constraints block to `docs-updater.md`: (a) PRESERVE-ENTIRELY — never regenerate `docs/decisions.md`, `docs/anti-patterns.md`, or `docs/context/*` wholesale; surgical/additive edits only; candidate decisions go in the manifest, not into `decisions.md`. (b) No `.claude/` writes — every `Write`/`Edit` path resolves under `<target_root>/docs/` or `<target_root>/PRPs/reports/<feature>/`; the string `.claude/PRPs/` MUST NOT appear; cite `docs/anti-patterns.md` lines 60-66. (c) Never inject relay plugin defaults (`max_test_retries: 3`, the `tdd: false` default, PRP root path) into a target's `decisions.md`; cite `docs/anti-patterns.md` lines 51-56. (d) Never touch the `documentation/` HTML site. (e) Status-line discipline — the agent writes the manifest ending `*Status: DRAFT*` and NEVER emits `APPROVED`. Enumerate the explicit write scope: `docs/context/*`, `docs/domain/*`, `docs/decisions.md`, `docs/anti-patterns.md`, `CLAUDE.md`, `docs/KNOWLEDGE_BASE.md`, plus the manifest at `PRPs/reports/<feature>/docs-update.md`.
- **MIRROR**: `# SOURCE: plugins/relay/skills/context-builder/SKILL.md:1140-1143` (PRESERVE rule) and `# SOURCE: plugins/relay/agents/plan-writer.md:106-110` (`.claude/` prohibition wording).
- **VALIDATE**:
  ```powershell
  $f = 'C:\repos\PRPs-agentic-eng\plugins\relay\agents\docs-updater.md'
  $ok = (Select-String -Path $f -Pattern 'PRESERVE' -Quiet) -and `
        (Select-String -Path $f -SimpleMatch '.claude/' -Quiet) -and `
        (Select-String -Path $f -Pattern 'decisions\.md' -Quiet)
  if (-not $ok) { throw 'docs-updater.md missing a required constraint marker (PRESERVE / .claude/ / decisions.md)' }
  ```

### Task 3: WRITE the manifest contract, diff-driven procedure, dialogue clause, and handoff

- **Satisfies:** AC-A1, AC-A4
- **ACTION**: Add: (a) the manifest contract — `PRPs/reports/<feature>/docs-update.md` enumerating every touched file with a per-file rationale and ending with the two-line `*Generated: <YYYY-MM-DD>*` / `*Status: DRAFT*` block. (b) The diff-driven procedure — read `gh pr diff <pr>` via Bash, read `prd_path` from `orchestrator-run.json`, compare against the existing `docs/` files, make surgical edits, write the manifest. (c) The interactivity clause — the agent MAY ask the operator a question when a docs decision is genuinely ambiguous (a conscious, recorded extension of the downstream-autonomous rule). (d) The handoff confirmation naming the manifest path + touched-file count + the next step (Docs Reviewer via `/relay-approve`), with "do not emit anything after this line."
- **MIRROR**: `# SOURCE: plugins/relay/agents/plan-writer.md:643-651` (handoff shape).
- **VALIDATE**:
  ```powershell
  $f = 'C:\repos\PRPs-agentic-eng\plugins\relay\agents\docs-updater.md'
  $ok = (Select-String -Path $f -SimpleMatch 'PRPs/reports/' -Quiet) -and `
        (Select-String -Path $f -SimpleMatch '*Status: DRAFT*' -Quiet) -and `
        (Select-String -Path $f -SimpleMatch 'gh pr diff' -Quiet)
  if (-not $ok) { throw 'docs-updater.md missing manifest-path / DRAFT status-line / gh pr diff' }
  ```

### Task 4: VERIFY frontmatter validity, no APPROVED self-flip, and no .claude/ write path

- **Satisfies:** AC-A4, AC-A5
- **ACTION**: Re-read the finished file. Confirm: the YAML frontmatter parses (delimited by `---` on line 1 and a closing `---`); `tools:` lists exactly `Read, Write, Edit, Glob, Grep, Bash`; the body never instructs the agent to write `*Status: APPROVED*` over its own manifest (only `*Status: DRAFT*`); and no `Write`/`Edit` target path under `.claude/` is described (the only `.claude/` mentions must be quoted prohibition references). Fix any gap before declaring complete.
- **MIRROR**: `# SOURCE: plugins/relay/agents/plan-reviewer.md:1-6` (the reviewer owns the flip; the writer must not).
- **VALIDATE**:
  ```powershell
  $f = 'C:\repos\PRPs-agentic-eng\plugins\relay\agents\docs-updater.md'
  $lines = Get-Content $f
  # Frontmatter opens at line 1 and has a closing delimiter
  $fmOpen = ($lines[0] -eq '---')
  $fmClose = ($lines[1..($lines.Count-1)] | Select-String -SimpleMatch '---' | Select-Object -First 1) -ne $null
  # tools line present with the expected allowlist
  $toolsOk = (Select-String -Path $f -Pattern '^tools:\s*Read,\s*Write,\s*Edit,\s*Glob,\s*Grep,\s*Bash' -Quiet)
  # The agent must never self-flip to APPROVED
  $noSelfApprove = -not (Select-String -Path $f -SimpleMatch 'Status: APPROVED' -Quiet)
  if (-not ($fmOpen -and $fmClose -and $toolsOk -and $noSelfApprove)) {
    throw "docs-updater.md failed frontmatter/tools/no-self-approve verification"
  }
  ```

## Validation Commands

This is a docs / agent-authoring phase. `docs/context/methodology.md` has
`tdd: false` and `test_frameworks: []` (the relay repo is markdown + JSON),
so validation is filesystem / content-invariant oriented — there is no test
framework to invoke. Commands are PowerShell (primary shell on this Windows
host); bash equivalents are noted inline.

**Level 1 — STATIC_ANALYSIS (frontmatter / file well-formedness)**
```powershell
# The file exists and its YAML frontmatter is delimited by --- ... ---
$f = 'C:\repos\PRPs-agentic-eng\plugins\relay\agents\docs-updater.md'
if (-not (Test-Path $f)) { throw "missing $f" }
$lines = Get-Content $f
if ($lines[0] -ne '---') { throw 'frontmatter does not open with ---' }
$close = ($lines[1..($lines.Count-1)] | Select-String -SimpleMatch '---' | Select-Object -First 1)
if ($null -eq $close) { throw 'frontmatter has no closing ---' }
Select-String -Path $f -Pattern '^(name|description|model|color|tools):' | ForEach-Object { $_.Line }
```
_(bash: `test -f plugins/relay/agents/docs-updater.md && head -1 plugins/relay/agents/docs-updater.md | grep -qx -- '---' && grep -nE '^(name|description|model|color|tools):' plugins/relay/agents/docs-updater.md`)_

**Level 2 — CONTENT_INVARIANTS (required sections + constraints present)**
```powershell
$f = 'C:\repos\PRPs-agentic-eng\plugins\relay\agents\docs-updater.md'
$required = @('docs-updater', 'PRESERVE', '.claude/', 'gh pr diff',
              'PRPs/reports/', '*Status: DRAFT*', 'docs-reviewer',
              'decisions.md', 'documentation/')
$missing = $required | Where-Object { -not (Select-String -Path $f -SimpleMatch $_ -Quiet) }
if ($missing) { throw "docs-updater.md missing invariants: $($missing -join ', ')" }
# Negative invariant: the writer must never self-flip to APPROVED
if (Select-String -Path $f -SimpleMatch 'Status: APPROVED' -Quiet) {
  throw 'docs-updater.md must not contain a self-APPROVED status line'
}
"Level 2 OK"
```
_(bash: `for s in docs-updater PRESERVE '.claude/' 'gh pr diff' 'PRPs/reports/' '*Status: DRAFT*' docs-reviewer; do grep -qF -- "$s" plugins/relay/agents/docs-updater.md || { echo "missing $s"; exit 1; }; done; ! grep -qF 'Status: APPROVED' plugins/relay/agents/docs-updater.md`)_

**Level 3 — INTEGRATION (writer/reviewer-split & no-`.claude/`-write consistency)**
```powershell
$f = 'C:\repos\PRPs-agentic-eng\plugins\relay\agents\docs-updater.md'
# tools allowlist matches the plan's contract exactly
if (-not (Select-String -Path $f -Pattern '^tools:\s*Read,\s*Write,\s*Edit,\s*Glob,\s*Grep,\s*Bash\s*$' -Quiet)) {
  throw 'tools: allowlist does not match Read, Write, Edit, Glob, Grep, Bash'
}
# Every .claude/ mention is a prohibition reference, never a write target:
# assert the file does NOT instruct writing under .claude/ (heuristic: no "Write" + ".claude/" on one line)
$badWrite = Select-String -Path $f -Pattern '(Write|Edit).*\.claude/' -CaseSensitive -Quiet
if ($badWrite) { throw 'docs-updater.md appears to describe a Write/Edit under .claude/' }
"Level 3 OK — writer/reviewer split intact, no .claude/ write target"
```
_(bash: `grep -qE '^tools:[[:space:]]*Read, Write, Edit, Glob, Grep, Bash[[:space:]]*$' plugins/relay/agents/docs-updater.md && ! grep -qE '(Write|Edit).*\.claude/' plugins/relay/agents/docs-updater.md`)_

## Acceptance Criteria

- **AC-A1 (PRD AC-6):** `plugins/relay/agents/docs-updater.md` exists and instructs the agent to read `gh pr diff <pr>` and the source PRD (via `orchestrator-run.json` `prd_path`), then write a docs-update manifest at `PRPs/reports/<feature>/docs-update.md` (status `DRAFT`) that enumerates every touched file among `docs/context/`, `docs/domain/`, `docs/decisions.md`, `docs/anti-patterns.md`, `CLAUDE.md`, `docs/KNOWLEDGE_BASE.md` with a per-file rationale. (Level 2 invariants verify the manifest path + DRAFT status line + `gh pr diff` + scope markers.)
- **AC-A2 (PRD AC-6):** The agent prompt mandates surgical, additive edits and explicitly mirrors context-builder `*update` PRESERVE-ENTIRELY semantics — no PRESERVE-ENTIRELY file (`decisions.md`, `anti-patterns.md`, `docs/context/*`) is regenerated wholesale. (Level 2 verifies the `PRESERVE` + `decisions.md` markers.)
- **AC-A3 (PRD AC-9):** The agent prompt forbids any write under `.claude/` and forbids injecting relay plugin defaults into a target's `decisions.md`, citing `docs/anti-patterns.md` lines 60-66 and 51-56. (Level 3 verifies no `Write`/`Edit` target resolves under `.claude/`.)
- **AC-A4 (PRD AC-6, AC-7):** The agent never flips its own manifest to `*Status: APPROVED*` — it writes only `*Status: DRAFT*`, leaving the flip to the Docs Reviewer (Phase 2); the frontmatter `description` carries the never-approves-its-own-output disclaimer. (Level 2 negative invariant + Level 3 frontmatter check verify this.)
- **AC-A5 (PRD AC-6):** The frontmatter declares `tools: Read, Write, Edit, Glob, Grep, Bash` (Bash for `gh pr diff`), matching the PRD Architecture Notes' suggested allowlist, and the YAML parses (delimited frontmatter). (Level 1 + Level 3 verify.)

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| `pr_url` is NOT present in the `orchestrator-run.json` ALL_PHASES_COMPLETE shape (research-codebase gap), so the agent cannot read the merged PR number from that file | M | M | The agent prompt takes the PR number as a direct input from `/relay-approve <pr>` (the dispatcher), and reads only `feature` + `prd_path` from `orchestrator-run.json`. The plan's `## Inputs` (Task 1) makes this explicit; the actual `/relay-approve` wiring is Phase 3's responsibility. |
| Docs Updater overwrites human-validated content (the central PRD risk) | M | H | Task 2 mirrors the byte-exact PRESERVE-ENTIRELY rule from SKILL.md:1140-1143; candidate decisions are recorded in the manifest, never written into `decisions.md`. The Phase 2 Docs Reviewer rubric is the second line of defense. |
| Agent prompt drifts and instructs a `.claude/` write or a plugin-default injection | M | H | Hard-constraints block (Task 2) cites both anti-patterns by line; Level 3 validation asserts no `Write`/`Edit` path under `.claude/`. |
| No existing `docs-reviewer` agent yet to model the reviewer half (research gap) | L | L | This phase only needs the writer to respect the split (never self-flip); the reviewer is Phase 2. The `plan-reviewer` contract (Mandatory Reading priority 2) documents the split sufficiently. |
| research-web returned strongly-relevant external findings but no library/API contract | L | L | The web findings (per-file manifest gate, additive-vs-regenerative discipline) reinforce the design and are reflected in the manifest-with-rationale + PRESERVE constraints; no action needed beyond noting them. |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.
  - For this docs/agent-authoring phase the practical consequence is that validation is filesystem / content-invariant (PowerShell `Test-Path` / `Select-String`; bash `test -f` / `grep`), not a test-framework invocation — consistent with `test_frameworks: []` and with every prior relay agent-authoring phase.

- **`phase_type: docs` rationale:** the sole deliverable is a documentation-class file (`plugins/relay/agents/docs-updater.md`, a markdown agent prompt) with no application source. This `phase_type` is consumed by `plan-reviewer` Phase 0 and the `R-COH-VALIDATE-FRAMEWORK-MISMATCH` exemption branch, so the framework-mismatch check is correctly exempted here.

- **Color choice:** Task 1 should pick a `color` not already used by a sibling writer (prd-writer `blue`, plan-writer `orange`, plan-reviewer `cyan`); `green` is a safe default but the implementer may pick any unused value.

- **Research grounding:** research-codebase returned 8 findings with real `file:line` anchors (all cited in Mandatory Reading + Patterns to Mirror) plus 5 gaps (the most load-bearing — `pr_url` absent from `orchestrator-run.json`, and no existing `docs-reviewer` template — are captured in Risks). research-web returned 8 directly-relevant industry findings (Red Hat per-file manifest gate; additive-vs-regenerative discipline; scope-creep as the dominant agentic-PR failure mode) that corroborate the manifest-with-rationale and PRESERVE design; no degradation.

- **Dogfood opportunity:** once Phases 2-4 land, this very phase's merged PR is a natural first real input for the shipped Docs Updater.

*Generated: 2026-06-18*
*Approved: 2026-06-18*
*Status: IMPLEMENTED*
