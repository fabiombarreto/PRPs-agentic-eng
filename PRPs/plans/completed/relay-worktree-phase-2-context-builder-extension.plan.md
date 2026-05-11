# Feature: context-builder extension (Phase 2 of relay-worktree)

```
**Decision Gate**
- Active context: docs/context/architecture.md (relay plugin marketplace; Pillar 1 context-builder skill; PRP artifact paths)
- Activated criteria: edit to existing skill file in plugins/relay/skills/context-builder/; first executable artifact emitted by context-builder (scripts/worktree-bootstrap.sh); cross-cutting change to .gitignore auto-write behavior (D7 evolution from advisory-only); new artifact in the PRESERVE-ENTIRELY class alongside PRPs/redaction-extensions.txt
- Decisions found:
  - D6 bootstrap hook contract (relay-worktree.prd.md Decisions Log) — project-owned script; context-builder emits template on *init only; failure is non-fatal; mirrors the precedent of .claude/settings.json allowlist (template + customize)
  - D7 .gitignore auto-write evolution (relay-worktree.prd.md Decisions Log) — context-builder *init auto-appends .worktrees/ line with comment; *update is no-op; closes the gap at SKILL.md:1090-1106 where the entry was advisory only
  - D9 bootstrap timeout default 60 seconds (relay-worktree.prd.md Decisions Log) — template should reflect the 60s default as a comment so teams know what to align their bootstrap script to
  - PRESERVE-ENTIRELY rule (SKILL.md:861-868) — update behavior: file exists with substantive entries → preserve entirely; applies to both .gitignore (after first *init write) and scripts/worktree-bootstrap.sh (after team edits)
  - PRP artifact paths under PRPs/, never .claude/ (docs/decisions.md, 2026-04-19) — the new emitted artifacts (.gitignore line, scripts/worktree-bootstrap.sh) are target-project files, not PRPs artifacts; no conflict
  - Plugin manifest version-sync rule (docs/decisions.md, 2026-04-30) — no version bump in Phase 2; bump is deferred to Phase 5 which cuts v0.11.0
- Applicable anti-patterns:
  - Writing pipeline artifacts under .claude/ (docs/anti-patterns.md lines 60-66) — the emitted .gitignore line and scripts/worktree-bootstrap.sh are setup-time artifacts (target project files), not autonomous-pipeline artifacts; the .claude/ restriction does not apply to them; no exception entry needed
  - Relying on interactive permission prompts in the autonomous loop (docs/anti-patterns.md lines 79-84) — not directly applicable to this phase (no Bash shell-outs from context-builder itself during emission); the chmod step is documented as a manual step on Windows per the PRD Open Questions
  - Injecting plugin defaults into the target project's decisions.md (docs/anti-patterns.md) — the emitted bootstrap template must NOT embed relay plugin defaults; it is project-owned configuration with TODO markers only
- Applicable architectural rules:
  - Three-pillar Pillar 1 (Initialization) — context-builder is Pillar 1; this phase extends it with two new artifact-emission actions in the *init path
  - PRESERVE-ENTIRELY update rule — *update must leave both .gitignore and scripts/worktree-bootstrap.sh untouched when they already carry the expected entries/content
  - Idempotent *init — if .worktrees/ already appears in .gitignore, skip the append; if scripts/worktree-bootstrap.sh already exists, skip creation (error unless [R] Recreate chosen at Phase 0, per Phase 1.5 and 1.75 behavior patterns)
  - No writes under .claude/ — the entire extension is in plugins/relay/skills/context-builder/SKILL.md and at runtime produces target-project files outside .claude/
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/relay-worktree.prd.md` — Implementation Phases row 2: "context-builder extension" — Goal: ship the supporting artifacts (`.gitignore` line + `scripts/worktree-bootstrap.sh` template) without breaking existing `context-builder` consumers — Success signal: running `context-builder *init` on a clean target project produces both artifacts at the expected paths with the expected content; running `*update` on a project with team-edited versions of either artifact leaves them unchanged.

## Summary

This phase delivers two surgical additions to `plugins/relay/skills/context-builder/SKILL.md`: a new **Phase 1.8** section (inserted between Phase 1.75 `PRPs/redaction-extensions.txt` and Phase 2 `docs/context`) that specifies (a) reading the target project's `.gitignore`, checking for a `.worktrees/` entry, and appending it with a comment header if absent, and (b) emitting `scripts/worktree-bootstrap.sh` with a canonical template (shebang, CHANGELOG-style comment header, four commented-out TODO blocks: env-file replication, Docker Compose project name override, dependency install, port allocation) when the file does not exist. The section also documents the `*update` no-op behavior for both artifacts (PRESERVE-ENTIRELY once the team has touched them), the `chmod +x` step for non-Windows hosts, the idempotency check logic, and the Final Report documentation of both new artifacts. No new agents, no new commands, and no version bump in this phase.

## User Story

```
As a relay-developer who runs context-builder *init on a new target project
I want .worktrees/ automatically added to .gitignore and scripts/worktree-bootstrap.sh automatically emitted
So that my project is wired for /relay-worktree from day one without manual gitignore edits or bootstrap-template lookup
```

## Problem Statement

Today, `context-builder *init` advises the team to add `.worktrees/` to `.gitignore` in the Final Report's `.gitignore follow-ups` section (SKILL.md:1090-1106), but it does NOT write that line automatically. The advisory approach produces drift: teams skip the step, ephemeral worktrees appear in `git status`, and the parallelism value of `/relay-worktree` is degraded. Similarly, `scripts/worktree-bootstrap.sh` does not exist at all — teams who want to wire per-worktree setup (env-file replication, Docker Compose project name, dependency install) have no starter template and must author it from scratch against an undocumented interface. Phase 2 closes both gaps in the one place where zero-friction setup is possible: the `*init` invocation the team already runs when bootstrapping a project for relay.

## Solution Statement

Edit `SKILL.md` to insert **Phase 1.8** between Phase 1.75 and Phase 2. Phase 1.8 has two sub-steps:

**Sub-step A — `.gitignore` append:** Read the target project's root `.gitignore` (if it exists). Search for a line equal to `.worktrees/`. If absent, append two lines — `# relay — per-feature worktrees (ephemeral)` followed by `.worktrees/` — at the end of the file (or create the file with those two lines if it does not exist). If `.worktrees/` is already present (exact match on the entry line), skip silently. Update behavior: do not touch `.gitignore` regardless of its content (the team may have removed or restructured it deliberately).

**Sub-step B — `scripts/worktree-bootstrap.sh` emission:** Check whether `scripts/worktree-bootstrap.sh` exists. If not: create the `scripts/` directory if absent; write the canonical template (shebang + CHANGELOG-style comment header naming the source PRD + four commented-out TODO blocks per the PRD's AC-11 spec); emit a post-write note that on non-Windows hosts the team must run `chmod +x scripts/worktree-bootstrap.sh` (or `git update-index --chmod=+x scripts/worktree-bootstrap.sh` for the git-tracked executable bit). If the file already exists and Phase 0 user did NOT choose [R] Recreate: HALT with a clear error matching the Phase 1.5/1.75 error shape. Update behavior: LEAVE IT ALONE regardless of content (PRESERVE-ENTIRELY rule mirrors PRPs/redaction-extensions.txt).

The Final Report's `### Files created` section is extended to list both artifacts when created; the existing `.gitignore follow-ups` subsection (SKILL.md:1081-1106) is updated to reflect that the `.worktrees/` entry is now auto-written (no longer advisory) and that `scripts/worktree-bootstrap.sh` is now emitted.

## Metadata

| Key | Value |
|-----|-------|
| Type | Skill-file edit (markdown prompt extension) |
| Complexity | Low — two additive sub-steps inserted in an existing skill; no new agents, no new commands; the main complexity is precisely specifying idempotency checks and PRESERVE behavior so downstream implementers do not introduce regressions for existing context-builder consumers |
| Systems Affected | `plugins/relay/skills/context-builder/SKILL.md` (one file edited, two new sub-sections added + Final Report section updated) |
| Dependencies | Phase 1 complete (`PRPs/plans/completed/relay-worktree-phase-1-relay-worktree-command-file.plan.md` — establishes the bootstrap hook contract D6 and .gitignore auto-write D7 that this phase implements); `SKILL.md:277-319` (Phase 1.75 redaction-extensions.txt pattern to mirror for init/update behavior and error shape); `SKILL.md:861-868` (PRESERVE-ENTIRELY rule governing update behavior for both new artifacts); `SKILL.md:1081-1106` (existing .gitignore follow-ups section that needs updating); PRD AC-10, AC-11 |
| Estimated Tasks | 4 |
| Source PRD line ref | `PRPs/prds/relay-worktree.prd.md` row 2 (line 191) |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `plugins/relay/skills/context-builder/SKILL.md` | 277-319 | Phase 1.75 pattern — the canonical model for init/update/error behavior when emitting a new project-level artifact; new Phase 1.8 must mirror this shape exactly |
| P0 | `plugins/relay/skills/context-builder/SKILL.md` | 861-868 | PRESERVE-ENTIRELY update rule — the invariant that governs *update behavior for both new artifacts (decisions.md pattern; PRPs/redaction-extensions.txt inherits it; Phase 1.8 must too) |
| P0 | `plugins/relay/skills/context-builder/SKILL.md` | 1040-1107 | Phase 8 Final Report template + .gitignore follow-ups section — the section being edited to reflect auto-write and bootstrap template emission |
| P1 | `PRPs/prds/relay-worktree.prd.md` | 76-77 (AC-10, AC-11) | Exact acceptance criteria for the .gitignore append logic and bootstrap template content |
| P1 | `PRPs/prds/relay-worktree.prd.md` | 166-168 (Phase 2 scope) | Canonical list of the four TODO blocks and the chmod step requirement |
| P1 | `PRPs/plans/completed/relay-worktree-phase-1-relay-worktree-command-file.plan.md` | 1-35 | Decision Gate + Source PRD pointer from Phase 1 — confirms D6/D7 decisions that this phase implements |
| P2 | `plugins/relay/skills/context-builder/SKILL.md` | 221-319 | Phase 1.5 and 1.75 together — shows the full init/update/graceful-degradation pattern that Phase 1.8 must follow |

## Patterns to Mirror

The following snippets are sourced from real lines in SKILL.md and represent the patterns the implementer must replicate in the new Phase 1.8 section.

---

**Pattern 1 — Phase header + artifact scope statement (from Phase 1.75)**

```
# SOURCE: plugins/relay/skills/context-builder/SKILL.md:277-285
```

```markdown
## Phase 1.75: Create `PRPs/redaction-extensions.txt`

Per-project extensions layer for the redaction policy at
`${CLAUDE_PLUGIN_ROOT}/docs/context/redaction-policy.md`. Teams add
additional env var names or value regex here when their secrets don't
match the invariant defaults.

Create the `PRPs/` directory if it doesn't exist.
```

Used by: Task 1 (write the Phase 1.8 header and opening statement).

---

**Pattern 2 — Init behavior: file-exists error, [R] Recreate handling, and creation path**

```
# SOURCE: plugins/relay/skills/context-builder/SKILL.md:309-313
```

```markdown
### Init behavior

- If the file does NOT exist: create with the default content above.
- If it exists and Phase 0 user chose [R] Recreate: overwrite with default.
- Otherwise (exists, not [R]): HALT with clear error, same as Phase 1.5.
```

Used by: Task 1 (scripts/worktree-bootstrap.sh init behavior block). The `.gitignore` init behavior differs — it uses an idempotency check (append-if-absent) rather than an error-on-exists, because `.gitignore` is a cumulative file, not an owned relay artifact. This divergence must be called out explicitly in the new section.

---

**Pattern 3 — Update behavior: LEAVE IT ALONE**

```
# SOURCE: plugins/relay/skills/context-builder/SKILL.md:315-319
```

```markdown
### Update behavior

- If the file exists: LEAVE IT ALONE. The team may have added
  project-specific entries; re-generation would overwrite them.
- If the file is missing: create with default content (same as init).
```

Used by: Task 1 (update behavior blocks for both .gitignore and scripts/worktree-bootstrap.sh).

---

**Pattern 4 — PRESERVE ENTIRELY rule (governing decisions.md; analogous for new artifacts)**

```
# SOURCE: plugins/relay/skills/context-builder/SKILL.md:861-868
```

```markdown
**Update behavior:**

- **If the file exists and has at least one substantive entry** (not just
  the template/header): PRESERVE ENTIRELY. Do not add, modify, or
  re-infer. Report in the Final Report what new decisions the scan would
  have inferred — the team reviews and adds manually.
- **If the file exists but is empty/template-only**: run Init behavior to
  populate initial inferences.
- **If the file is missing**: run Init behavior.
```

Used by: Task 1 (update behavior for scripts/worktree-bootstrap.sh — the script is always "substantive" once the team first receives it, so update mode is always PRESERVE ENTIRELY).

---

**Pattern 5 — .gitignore follow-ups section (current advisory text to be replaced)**

```
# SOURCE: plugins/relay/skills/context-builder/SKILL.md:1081-1106
```

```markdown
### .gitignore follow-ups (init mode and first-run update)
If `.claude/settings.json` was created or will be tracked for the first
time, the team MUST verify `.gitignore` meets these requirements:

1. Ignore the rest of `.claude/` using the **`.claude/*` form, NOT
   `.claude/`** ...
2. Immediately below, `!.claude/settings.json` to re-include ...
3. Add `.worktrees/` to ignore per-feature ephemeral worktrees the
   relay pipeline creates.

...

The context-builder does NOT modify `.gitignore` automatically — it is
project-controlled and the team may have conventions of its own. List
this in the Report for every `*init` run ...
```

Used by: Task 3 (update the Final Report section — remove the advisory statement "context-builder does NOT modify .gitignore automatically" and replace with "context-builder auto-appends .worktrees/ during *init; also emits scripts/worktree-bootstrap.sh template").

---

**Pattern 6 — Workflow Visualization block (shows phase insertion point)**

```
# SOURCE: plugins/relay/skills/context-builder/SKILL.md:37-49
```

```
            └─ Phase 0: Validate mode and environment (MCP Context7; init-only existing-artifacts prompt)
            └─ Phase 1: Scan project (always runs)
            └─ Phase 1.5: Generate/update .claude/settings.json
            └─ Phase 1.75: Create PRPs/redaction-extensions.txt
            └─ Phase 2: Create/update docs/context
            ...
```

Used by: Task 2 (insert `└─ Phase 1.8: Emit .gitignore worktree line + scripts/worktree-bootstrap.sh` between Phase 1.75 and Phase 2 in the workflow visualization block).

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/skills/context-builder/SKILL.md` | UPDATE | Insert Phase 1.8 section (two sub-steps: .gitignore append and scripts/worktree-bootstrap.sh emission); update Workflow Visualization block; update Phase 8 Final Report section (.gitignore follow-ups advisory → auto-write note; add bootstrap template emission to Files created list) |

## NOT Building (Scope Limits)

- **Stack-specific bootstrap template content.** The template ships with generic commented-out TODO blocks only; no attempt is made to detect the target project's stack (Django, Phoenix, Rails, etc.) and pre-fill specific Makefile targets or Docker Compose file names. Stack auto-detection in the emitted bootstrap template is a Could-item deferred to post-dogfood telemetry (PRD "What We're NOT Building").
- **PowerShell bootstrap template (`scripts/worktree-bootstrap.ps1`).** The PRD's Phase 2 scope covers the `.sh` variant only. The `.ps1` variant is deferred to the Windows-specific dogfood finding (Open Questions item in the PRD).
- **`/relay-execute` D4 live wiring.** That is Phase 3 (separate plan). Phase 2 does not touch `relay-execute.md`.
- **Worktree cleanup (`git worktree remove`).** Out of scope for the entire relay-worktree PRD Phase 2; deferred to Pillar 3 (`/relay-approve`).
- **Dependency installation orchestration.** The bootstrap template includes a commented-out TODO block for this; relay does not implement it. The project's bootstrap script is responsible.
- **`EnterWorktree` native tool integration.** Explicitly rejected (D2); not revisited here.
- **Version bump to v0.11.0.** Phase 5 cuts the release. Phase 2 does not bump `plugin.json`.

## Step-by-Step Tasks

### Task 1: INSERT Phase 1.8 section in SKILL.md (between Phase 1.75 and Phase 2)

- **ACTION**: Edit `plugins/relay/skills/context-builder/SKILL.md` — insert a new `## Phase 1.8` section immediately after the Phase 1.75 `### Update behavior` closing block (after line 319) and before the `## Phase 2` header. The section must contain:
  - Opening statement explaining both artifacts emitted and their purpose.
  - **Sub-step A — `.gitignore` append** with:
    - Init behavior: read root `.gitignore`; search for `.worktrees/` line (exact match); if absent, append `# relay — per-feature worktrees (ephemeral)` + `.worktrees/`; if `.gitignore` does not exist, create it with those two lines; if `.worktrees/` is already present, skip silently.
    - Update behavior: do NOT touch `.gitignore` under any circumstances (PRESERVE-ENTIRELY; the team may have reorganized or removed the entry deliberately).
  - **Sub-step B — `scripts/worktree-bootstrap.sh` emission** with:
    - Init behavior: if the file does NOT exist — create `scripts/` directory if absent; write the canonical template (see template spec below); emit a post-write note about `chmod +x` or `git update-index --chmod=+x` for non-Windows hosts; if it exists and Phase 0 user chose [R] Recreate — overwrite; otherwise — HALT with clear error matching Phase 1.5 error shape.
    - Update behavior: LEAVE IT ALONE if the file exists; create with default content if missing (same as init).
  - **Canonical bootstrap template** to embed in Sub-step B:
    ```
    #!/usr/bin/env bash
    # scripts/worktree-bootstrap.sh
    #
    # Generated by relay context-builder — project-owned, edit freely.
    # Source PRD: PRPs/prds/relay-worktree.prd.md
    # Invoked by /relay-worktree as: scripts/worktree-bootstrap.sh <absolute-worktree-path>
    # Timeout: 60 seconds (relay default, D9). $1 = absolute path to the new worktree.
    #
    set -euo pipefail
    WORKTREE_PATH="${1:?Usage: worktree-bootstrap.sh <absolute-worktree-path>}"

    # TODO: Uncomment and adapt — env-file replication
    # Copy gitignored env files from the repo root into the new worktree.
    # cp .env.local "${WORKTREE_PATH}/.env.local"
    # cp .env.test  "${WORKTREE_PATH}/.env.test"

    # TODO: Uncomment and adapt — Docker Compose project name override
    # Prevents container/network/volume name collisions between worktrees.
    # FEATURE_SLUG="$(basename "${WORKTREE_PATH}")"
    # echo "COMPOSE_PROJECT_NAME=relay-${FEATURE_SLUG}" >> "${WORKTREE_PATH}/.env.local"

    # TODO: Uncomment and adapt — dependency install
    # Run after env files are in place so the install can read them.
    # cd "${WORKTREE_PATH}" && pnpm install --frozen-lockfile

    # TODO: Uncomment and adapt — port allocation
    # Derive an offset from the feature slug hash to avoid port collisions.
    # OFFSET=$(( $(echo -n "${WORKTREE_PATH}" | cksum | cut -d' ' -f1) % 1000 ))
    # echo "PORT=$(( 3000 + OFFSET ))" >> "${WORKTREE_PATH}/.env.local"
    ```

- **MIRROR**: Pattern 2 (init/update/error behavior shape from Phase 1.75); Pattern 3 (LEAVE IT ALONE update rule); Pattern 4 (PRESERVE-ENTIRELY rule)
- **VALIDATE**: `grep -n "## Phase 1.8" "C:\repos\PRPs-agentic-eng\plugins\relay\skills\context-builder\SKILL.md" && grep -n "worktree-bootstrap.sh" "C:\repos\PRPs-agentic-eng\plugins\relay\skills\context-builder\SKILL.md" && grep -n "LEAVE IT ALONE" "C:\repos\PRPs-agentic-eng\plugins\relay\skills\context-builder\SKILL.md"`

### Task 2: UPDATE Workflow Visualization block in SKILL.md

- **ACTION**: Edit the Workflow Visualization block in SKILL.md (around line 37-49 in the current file) to insert `└─ Phase 1.8: Emit .gitignore worktree line + scripts/worktree-bootstrap.sh` on the line immediately after `└─ Phase 1.75: Create PRPs/redaction-extensions.txt` and before `└─ Phase 2: Create/update docs/context`. This keeps the workflow visualization in sync with the actual phase order. (Satisfies AC-A6 / PRD AC-10, AC-11)
- **MIRROR**: Pattern 6 (Workflow Visualization block structure)
- **VALIDATE**: `grep -n "Phase 1.8" "C:\repos\PRPs-agentic-eng\plugins\relay\skills\context-builder\SKILL.md" | grep -i "workflow\|visualization\|1\.75\|1\.8\|2:"`

### Task 3: UPDATE Final Report section — .gitignore follow-ups advisory → auto-write note

- **ACTION**: Edit the Phase 8 Final Report `.gitignore follow-ups` subsection (currently at SKILL.md:1081-1106) to replace the advisory paragraph "The context-builder does NOT modify `.gitignore` automatically — it is project-controlled and the team may have conventions of its own. List this in the Report for every `*init` run ..." with a note that:
  - `.worktrees/` is now **auto-appended** during `*init` by Phase 1.8 (no longer advisory).
  - `scripts/worktree-bootstrap.sh` is now **auto-emitted** during `*init` by Phase 1.8.
  - Both items appear in `### Files created` when created for the first time.
  - If `.worktrees/` was already in `.gitignore` before `*init`, note it as "already present — skipped" in `### Files updated`.
  - If `scripts/worktree-bootstrap.sh` already existed (not [R] mode), note it as a HALT condition in `### Skipped`.
  - The remaining `.claude/*` and `!.claude/settings.json` gitignore items remain advisory-only (unchanged from current text).
  (Satisfies AC-A7, AC-A8 / PRD AC-10, AC-11)
- **MIRROR**: Pattern 5 (current .gitignore follow-ups section — the text to replace)
- **VALIDATE**: `grep -n "auto-appended\|auto-emitted\|does NOT modify" "C:\repos\PRPs-agentic-eng\plugins\relay\skills\context-builder\SKILL.md"`

### Task 4: VERIFY structural integrity of SKILL.md after edits

- **ACTION**: After all three edits, read through the modified SKILL.md to confirm: (a) Phase numbering is sequential: 1 → 1.5 → 1.75 → 1.8 → 2 → 3 → 4 → 4.5 → 5 → 6 → 7 → 8; (b) no orphaned heading levels (each `##` Phase section has at least one `###` sub-section or body paragraph); (c) the Workflow Visualization block lists Phase 1.8 in the correct position; (d) the Final Report section no longer contains "does NOT modify `.gitignore` automatically"; (e) the bootstrap template in Phase 1.8 is a proper fenced code block with the shebang on the first line and all four TODO blocks present.
- **MIRROR**: Pattern 1 (phase header shape) and Pattern 6 (workflow visualization ordering)
- **VALIDATE**: `grep -n "^## Phase" "C:\repos\PRPs-agentic-eng\plugins\relay\skills\context-builder\SKILL.md"`

## Validation Commands

### Level 1 STATIC_ANALYSIS

```bash
# Markdown lint: verify no broken fence blocks and no orphaned headings
# (markdownlint may not be installed; fall back to a structural grep check)
grep -c "^## Phase" "C:\repos\PRPs-agentic-eng\plugins\relay\skills\context-builder\SKILL.md"
# Expected: a count >= 12 (existing phases + new Phase 1.8)

# Verify the new phase header exists and is syntactically correct
grep -n "^## Phase 1\.8" "C:\repos\PRPs-agentic-eng\plugins\relay\skills\context-builder\SKILL.md"
# Expected: one match at an appropriate line number between Phase 1.75 and Phase 2
```

### Level 2 CONTENT_INVARIANTS

```bash
# AC-10: .gitignore auto-write behavior is specified (not advisory)
grep -n "auto-append\|auto-appended\|append.*worktrees\|worktrees.*append" \
  "C:\repos\PRPs-agentic-eng\plugins\relay\skills\context-builder\SKILL.md"
# Expected: at least 1 match in Phase 1.8 sub-step A

# AC-11: bootstrap template shebang present
grep -n "#!/usr/bin/env bash" \
  "C:\repos\PRPs-agentic-eng\plugins\relay\skills\context-builder\SKILL.md"
# Expected: at least 1 match (the canonical template in Phase 1.8 sub-step B)

# AC-11: all four TODO blocks present
grep -n "TODO.*env-file\|TODO.*Docker Compose\|TODO.*dependency install\|TODO.*port allocation" \
  "C:\repos\PRPs-agentic-eng\plugins\relay\skills\context-builder\SKILL.md"
# Expected: 4 matches

# AC-11: *update no-op documented
grep -n "LEAVE IT ALONE\|PRESERVE ENTIRELY" \
  "C:\repos\PRPs-agentic-eng\plugins\relay\skills\context-builder\SKILL.md"
# Expected: at least 2 matches (one for .gitignore update behavior, one for bootstrap update behavior)

# Verify advisory "does NOT modify" language is gone
grep -c "does NOT modify" \
  "C:\repos\PRPs-agentic-eng\plugins\relay\skills\context-builder\SKILL.md"
# Expected: 0

# Confirm PRESERVE-ENTIRELY rule reference still intact at 861-868 context
grep -n "PRESERVE ENTIRELY" \
  "C:\repos\PRPs-agentic-eng\plugins\relay\skills\context-builder\SKILL.md"
# Expected: >= 3 (existing decisions.md pattern + the two new Phase 1.8 occurrences)
```

### Level 3 INTEGRATION — DRY-RUN REVIEW

```bash
# Read the modified SKILL.md in full and manually trace the *init flow:
# Phase 0 → Phase 1 → Phase 1.5 → Phase 1.75 → Phase 1.8 (NEW) → Phase 2 ...
# Verify that Phase 1.8 appears as a coherent step, references no undefined
# variables (uses the same ${CLAUDE_PLUGIN_ROOT} convention as Phase 1.75),
# and that the update behavior for both artifacts is unambiguously "no-op when present".

# Structural check: Phase 1.8 comes after Phase 1.75 and before Phase 2
python -c "
import re, sys
content = open(r'C:\repos\PRPs-agentic-eng\plugins\relay\skills\context-builder\SKILL.md').read()
phases = [(m.group(), m.start()) for m in re.finditer(r'^## Phase \d+[\.\d]*', content, re.MULTILINE)]
for p in phases:
    print(p)
" 2>&1
# Expected: Phase 1.75 listed before Phase 1.8, Phase 1.8 listed before Phase 2

# Verify Workflow Visualization contains Phase 1.8 entry
grep -n "Phase 1.8" "C:\repos\PRPs-agentic-eng\plugins\relay\skills\context-builder\SKILL.md"
# Expected: >= 2 matches (Workflow Visualization + Phase body header)
```

## Acceptance Criteria

- **AC-A1 (PRD AC-10):** After the edit, `plugins/relay/skills/context-builder/SKILL.md` Phase 1.8 Sub-step A specifies: read the target project's root `.gitignore`; search for a line equal to `.worktrees/`; if absent, append `# relay — per-feature worktrees (ephemeral)` followed by `.worktrees/`; if `.gitignore` does not exist, create it with those two lines; if `.worktrees/` is already present, skip silently. The Level 2 grep `grep -n "auto-append\|append.*worktrees"` returns at least one match.
- **AC-A2 (PRD AC-10):** Phase 1.8 Sub-step A documents *update behavior as "do NOT touch `.gitignore`" (PRESERVE-ENTIRELY semantics) regardless of whether the `.worktrees/` entry is present or absent. The Level 2 grep for `LEAVE IT ALONE` returns at least one match associated with the `.gitignore` update block.
- **AC-A3 (PRD AC-11):** Phase 1.8 Sub-step B specifies emission of `scripts/worktree-bootstrap.sh` containing: shebang `#!/usr/bin/env bash`; CHANGELOG-style comment header naming the source PRD (`PRPs/prds/relay-worktree.prd.md`); the 60-second timeout comment (referencing D9); four commented-out TODO blocks (env-file replication, Docker Compose project name override, dependency install, port allocation). All four blocks present per Level 2 grep.
- **AC-A4 (PRD AC-11):** Phase 1.8 Sub-step B documents `*update` no-op behavior for `scripts/worktree-bootstrap.sh` — if the file exists and Phase 0 user did not choose [R] Recreate, the skill LEAVEs IT ALONE. Level 2 grep for `LEAVE IT ALONE` returns at least one match associated with the bootstrap script update block.
- **AC-A5 (PRD AC-11):** The `chmod +x` (or `git update-index --chmod=+x`) requirement for non-Windows hosts is documented in Sub-step B following the template. The edit does not assert this step runs automatically on Windows.
- **AC-A6 (PRD AC-10, AC-11):** The Workflow Visualization block (SKILL.md top section) includes `Phase 1.8` between `Phase 1.75` and `Phase 2`. Level 3 Python structural check confirms ordering.
- **AC-A7 (PRD AC-10):** The Phase 8 Final Report section no longer contains the advisory phrase "context-builder does NOT modify `.gitignore` automatically". Level 2 grep `grep -c "does NOT modify"` returns 0.
- **AC-A8 (PRD AC-10, AC-11):** The Phase 8 Final Report `.gitignore follow-ups` subsection documents both new artifacts: auto-appended `.worktrees/` line during `*init`; auto-emitted `scripts/worktree-bootstrap.sh` during `*init`; both appear in `### Files created` when created; already-present entries are noted as "skipped" in the report.
- **AC-A9 (PRD AC-11):** The existing PRESERVE-ENTIRELY rule at SKILL.md lines 861-868 is unchanged. Level 2 grep for `PRESERVE ENTIRELY` returns >= 3 matches total (existing decisions.md context + two new Phase 1.8 occurrences).

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Edit to SKILL.md breaks the Phase 1.75→Phase 2 flow continuity (orphaned heading, missing blank line between sections) | M | M | Task 4 VERIFY step does a full structural read after all edits; Level 3 Python grep confirms phase ordering |
| The four TODO blocks in the bootstrap template drift from the PRD's AC-11 spec (e.g., port-allocation block omitted or incorrectly commented) | L | M | Level 2 grep explicitly checks for all four TODO block keywords; AC-A3 validates all four are present |
| `.gitignore` update behavior is accidentally specified as "append if absent" instead of "no-op" — breaking existing consumers who removed `.worktrees/` on purpose | M | H | Sub-step A update behavior is spelled out as "do NOT touch .gitignore under any circumstances"; separate grep check (`LEAVE IT ALONE`) in Level 2; AC-A2 enforces |
| Final Report advisory text partially removed (some sentences remain, creating contradictory guidance) | L | M | Level 2 grep `grep -c "does NOT modify"` must return 0; Task 3 requires replacing the entire advisory paragraph, not selective line removal |
| Phase 1.8 section is inserted after Phase 2 instead of before it (wrong position due to long SKILL.md) | L | H | Task 2 explicitly inserts in Workflow Visualization AND Task 1 uses the Phase 1.75 closing block as the `old_string` anchor, which is a unique string; Level 3 Python check verifies ordering |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. TDD track inactive — tests written alongside implementation. Acceptance Criteria seed those tests.

**Divergence from standard Phase 1.75 init/update pattern for `.gitignore`:** Unlike `PRPs/redaction-extensions.txt` (which is relay-owned and errors on exists unless [R] Recreate), `.gitignore` is a project-owned cumulative file that relay should treat as additive. The init behavior for Sub-step A is "append if absent, skip if present" rather than "error if exists". This divergence is intentional and must be called out explicitly in the new Phase 1.8 section so future SKILL.md readers do not accidentally harmonize the two behaviors.

**Windows executable bit:** On Windows without WSL or Git Bash, `chmod +x` is a no-op or unavailable. The plan documents the `git update-index --chmod=+x scripts/worktree-bootstrap.sh` alternative (which sets the executable bit in the git index even on Windows) and defers deeper Windows bootstrap support to the Open Questions item in the source PRD.

**Source file length:** SKILL.md is currently ~1147 lines. The new Phase 1.8 section adds approximately 60–80 lines. The structural grep checks in Validation Commands use absolute paths (PowerShell-safe backslashes) consistent with the Windows environment; the Python snippet uses a raw string path.

**No dogfood in this phase:** The success signal (running `context-builder *init` on a clean target project and observing both artifacts) is validated by Phase 4 of the relay-worktree PRD (Synthetic dogfood), not by this phase. This plan's validation commands are static/content checks against the modified SKILL.md only.

*Generated: 2026-05-10*
*Approved: 2026-05-10*
*Implemented: 2026-05-11*
*Status: IMPLEMENTED*
