# Feature: Go green (Phase 3 of validation-suite)

```
**Decision Gate**
- Active context: none
- Activated criteria: documentation/ site edits GOVERNED by documentation/AGENTS.md (three-file registration + a mandatory changelog.html entry for every site change); cross-cutting content/config fixes spanning plugins/relay/ (agent + command frontmatter, a skill), docs/, documentation/, and PRPs/plans/; plugin component frontmatter modification (agents, commands); artifact rename under PRPs/plans/
- Decisions found:
  - [2026-04-19] plugins/prp-core/ is reference, not active relay code — every fix is scoped to plugins/relay/, docs/, documentation/, PRPs/plans/; nothing under plugins/prp-core/ is read or edited.
  - [2026-04-19] PRP artifacts live under PRPs/, never under .claude/ — the artifact reconciliation stays under PRPs/plans/; no artifact is written under .claude/.
  - [2026-04-19] Marketplace single-plugin; both manifests versioned (documentation/AGENTS.md §7.5) — this phase does NOT cut a new changelog release and does NOT bump plugin.json; all site changes go under the EXISTING `Unreleased` block (check B version-parity skips `id="unreleased"`, so parity stays green).
  - [2026-07-...] Universalize the test pair (docs/decisions.md:696) — the canonical old→new mapping the site rename follows: tdd-writer→test-writer, tdd-reviewer→test-reviewer, /relay-tdd→/relay-write-test, /relay-tdd-review→/relay-test-write-review.
  - [2026-04-19] Methodology declaration lives in docs/context/methodology.md — read at write time: tdd: false + test_frameworks: ["node:test"] → test-after ordering with an ACTIVE pair; the Implementer authors production/content ONLY and ZERO test files (R-X strict). This phase adds NO new testable code unit, so the pair authors ZERO new tests (the existing Phase 2 checker tests already cover the checks and continue to pass).
- Applicable anti-patterns:
  - "Writing pipeline artifacts under .claude/" — respected: every path resolves under plugins/relay/, docs/, documentation/, or PRPs/plans/; the string `.claude/PRPs` appears in no path.
  - "Treating plugins/prp-core/ as active relay code" — respected: no prp-core file is read or edited.
  - documentation/AGENTS.md §2 site invariants (no new CSS/JS files, no network deps, no emojis, relative paths, three-file registration) — respected by the site edits; no new page is added/removed/renamed, so NAV in assets/js/app.js is untouched; every site change is logged under the existing `Unreleased` block.
- Applicable architectural rules:
  - The documentation/ site is the rendered mirror of canonical docs/ — it must reflect the CURRENT command/agent names (the v0.19.0 rename).
  - Both manifests are versioned in lock-step — no version bump this phase; the version-parity contract stays green.
  - plugins/prp-core/ is external to the relay surface (scope invariant on every fix).
  - Interactivity boundary: autonomous (post-PRD-APPROVED); no user prompts.
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/validation-suite.prd.md` — Implementation Phases row 3: "Go green" — Goal: `npm run validate` exits 0 on the repo. — Success signal: `npm run validate` → exit 0; a re-introduced violation → exit non-zero. Scope: fix holes #1–#5 (including adding the `worktree-bootstrap.ps1` template to the context-builder skill); documentation-site edits register per `AGENTS.md` (NAV + search index + changelog entry).

## Summary

This phase turns the now-built static-validation suite green: `npm run validate` currently reports **6 failing checks** on the current tree, and this phase fixes every finding so it exits 0. The fixes are content/config edits (no new checks, no new application logic): (1) quote the three malformed YAML `description:` scalars that fail the native validator (check A errors); (2) remove the four leftover synthetic dogfood command fixtures that trip `--strict` warnings (check A); (3) add the required `tools:` frontmatter field to `post-green-reviewer.md` and `test-runner.md` (check F); (4) fix the dangling `.py`→`.mjs` reference in `docs/api-reference.md` (check D) and rename that file's two current-facing stale `/relay-tdd` command references; (5) reconcile the doubled-`.plan` review-log artifact by merging its record into the correctly-named sibling and deleting the mis-named file (check G); (6) add a `worktree-bootstrap.ps1` canonical template to the context-builder skill for `.sh`/`.ps1` parity (check P); (7) sync `documentation/assets/data/search-index.json` with the six missing command mentions and the two stale→renamed agent names (check C); and (8) eliminate the two stale `/relay-tdd` slash-command tokens from `documentation/changelog.html`, propagate the v0.19.0 rename across the nine `documentation/` site pages for consistency, and add the mandatory `AGENTS.md` changelog entry (check C + site governance). The definition of done is a single integration gate: `npm run validate` exits 0 with all 8 checks passing. Every fix is scoped to the exact flagged files; `docs/decisions.md` and `docs/domain/glossary.md` are deliberately NOT rewritten (they are historical / already-correct — see NOT Building).

## User Story

```
As the relay maintainer
I want every consistency hole the validation suite reports to be fixed so `npm run validate` exits 0
So that the suite is green on a clean tree, ready to be wired into a blocking pre-commit hook (Phase 4), and any future re-introduced violation turns the runner red again
```

## Problem Statement

The relay repository is Markdown prompts + JSON config with no runtime source code; its correctness lives in consistency invariants that rot silently. Phase 1 built the runner and check B; Phase 2 built checks A, C, D, E, F, G, P. Running `npm run validate` on the current tree now surfaces **six real, live defects** (the five known "holes" plus three bonus defects the suite caught): malformed YAML frontmatter that makes three components load with EMPTY metadata at runtime (serious), leftover synthetic dogfood command fixtures polluting the shipped command surface, two agents missing the required `tools:` frontmatter field, a dangling `scripts/normalize-test-output.py` reference (the file is `.mjs`), a mis-named `...plan.review.jsonl` artifact with a doubled `.plan` segment, a missing Windows `worktree-bootstrap.ps1` template, and a `documentation/` mirror site that still names the pre-v0.19.0 `/relay-tdd`/`/relay-tdd-review` commands and `tdd-writer`/`tdd-reviewer` agents while omitting six commands and two agents from its search index. None of these is fixed by adding new checks — every one is a fix to make the existing checks pass. This phase's whole job is to make `npm run validate` green.

## Solution Statement

Fix each of the six failing checks at its source, scoped to the exact flagged files, and prove green with one integration gate (`npm run validate` exits 0). The native-validator errors (check A) are fixed by quoting the three offending `description:` scalars so a real YAML parser accepts them; the `--strict` warnings (check A) are cleared by removing the four synthetic dogfood fixtures (the cleanest option — they are not shipped commands, and their generating PRDs/plans remain under `PRPs/` as history). The frontmatter-schema failures (check F) are fixed by adding an accurate `tools:` line to each of the two agents, derived from the tools their bodies actually invoke. The path-existence failure (check D) is fixed by correcting `.py`→`.mjs`. The artifact-naming failure (check G) is fixed by a merge-then-delete reconciliation that preserves both review verdicts. The bootstrap-parity failure (check P) is fixed by adding a canonical PowerShell template mirroring the existing bash one, with matching Init/Update emission behavior. The registration-parity failures (check C) are fixed by enriching `search-index.json` and removing the stale `/relay-tdd` slash tokens from `changelog.html`; because those touch the documentation site, the change also propagates the rename across the nine affected site pages for internal consistency and adds the mandatory `AGENTS.md` changelog entry under the existing `Unreleased` block (so version-parity stays green — no release cut, no plugin bump). `docs/decisions.md` (dated historical decision entries) and `docs/domain/glossary.md` (already-correct "formerly" attributions) are intentionally left untouched.

## Metadata

| Key | Value |
|-----|-------|
| Type | Fix / content + config (go-green) |
| Complexity | Medium (many small, well-localized edits across several surfaces; the coupling is the documentation/AGENTS.md three-file rule) |
| Systems Affected | plugins/relay/ (2 command frontmatters, 2 agent frontmatters, 1 skill, 4 dogfood fixtures removed), docs/api-reference.md, documentation/ site (search-index.json, changelog.html, 9 HTML pages), PRPs/plans/ (1 artifact merged, 1 deleted) |
| Dependencies | Phase 2 complete (checks A, C, D, E, F, G, P built and registered in `scripts/validate/index.mjs`) — satisfied (Depends: 2, Status complete) |
| Estimated Tasks | 9 |
| Source PRD line ref | `PRPs/prds/validation-suite.prd.md` Implementation Phases row 3 (line 295); Phase Details lines 319-325 |
| phase_type | docs |

> **phase_type rationale (docs):** the deliverable is documentation/content/config fixes — doc-site pages, doc references, component frontmatter metadata, a skill template, and an artifact rename — that add NO new application logic and NO new testable code unit. Its validation is filesystem/CLI/grep-oriented (the existing `npm run validate` suite, the native `claude plugin validate` CLI, targeted greps, `node --check`), not a test-framework (`node --test`) invocation. `docs` correctly exempts the phase from the `R-COH-VALIDATE-FRAMEWORK-MISMATCH` check and from test-first ordering: there is genuinely nothing new to unit-test this phase (the Phase 2 checker `*.test.mjs` already exist and continue to pass). This is NOT a `feature` phase (no new capability/logic), NOT `scaffold`/`foundation` (creates no new module or seam), and NOT `refactor` (behavior of the checks is unchanged).

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `PRPs/prds/validation-suite.prd.md` | 106-156, 319-325 | Acceptance Criteria (AC-2 umbrella green; AC-4 registration; AC-5 path-existence; AC-7 frontmatter schema; AC-8 artifact naming; AC-9 native wrap; AC-13 bootstrap parity) + Phase 3 Details (Goal / Scope / Success signal) |
| P0 | `documentation/AGENTS.md` | 1-9, 32-41, 239-381 | BINDING site contract: §2 invariants, §6 three-file registration (NAV + search-index + changelog), §7 changelog format + §7.3 `Unreleased` block + §7.5 version-sync (why NOT to cut a release / bump plugin.json this phase) |
| P0 | `scripts/validate/checks/registration-parity.mjs` | 45-104, 134-181 | Exactly what check C flags: per-command `/relay-<name>` diff (missing+stale) over search-index.json + changelog.html visible text; per-agent whole-word missing-only diff over BOTH surfaces; NAV is page-level only |
| P0 | `scripts/validate/checks/native-validate.mjs` | 36-77 | Check A shells out to `claude plugin validate ./plugins/relay --strict`; non-zero exit (errors OR --strict warnings) surfaces as a finding; degrades gracefully only when the `claude` CLI is absent |
| P1 | `scripts/validate/checks/path-existence.mjs` | 55-79, 150-167 | Check D allowlist: backtick `scripts/<...>` references must resolve on disk (excluding worktree-bootstrap.*); confirms `docs/api-reference.md:120` `.py` is the dangling class |
| P1 | `scripts/validate/checks/artifact-naming.mjs` | 22-57 | Check G regex `/\.plan\.(review|code-review|test-write-review)\.jsonl$/`; top-level `PRPs/plans/*.jsonl` only (completed/ not descended); deleting the doubled file clears it |
| P1 | `scripts/validate/checks/bootstrap-parity.mjs` | 25-63 | Check P: SKILL.md emits `worktree-bootstrap.sh` but not `worktree-bootstrap.ps1` → fail; the `worktree-bootstrap.ps1` token must appear |
| P1 | `scripts/validate/schemas/agent.schema.json` | 1-16 | `tools` is a REQUIRED agent frontmatter field (non-empty string) — the exact rule check F enforces on the two `tools:`-less agents |
| P1 | `plugins/relay/skills/context-builder/SKILL.md` | 397-465 | Phase 1.8 Sub-step B: the canonical bash `worktree-bootstrap.sh` template + Init/Update/HALT emission behavior to mirror for the `.ps1` variant |
| P1 | `docs/context/methodology.md` | 1-42 | `tdd: false` + `test_frameworks: ["node:test"]` → test-after, active pair, R-X strict; the pair authors ZERO new tests this phase |

## Patterns to Mirror

```yaml
# SOURCE: plugins/relay/agents/prd-reviewer.md:3   (malformed — anti-pattern to fix)
description: Validate a DRAFT PRD against the 7-item structural rubric ... Returns APPROVED (main mode: rubric passes + user confirms), RUBRIC_PASSED (subagent mode: rubric passes), or CHANGES_REQUESTED ...
```
The unquoted plain scalar contains `: ` (colon-space) inside `(main mode: rubric passes ...)`, which a real YAML parser reads as an illegal nested mapping and rejects (`Unexpected token`). Fix: wrap the WHOLE scalar in double quotes so the `:` characters are literal — `description: "Validate a DRAFT PRD ... CHANGES_REQUESTED (any failure). Never accepts caller-relayed consent as the user's approval."` (double quotes chosen because the value contains an apostrophe in `user's` and no `"`; escape any embedded `"` as `\"`). Apply the identical fix to `plugins/relay/commands/relay-plan.md:2` (`In PRD mode (argument ends with .prd.md): validates ...` / `In description mode (...): skips P2 and P4 ...`) and `plugins/relay/commands/relay-write-test.md:2` (the backticked `` `test_frameworks: []` `` colon-space). Tasks 1 uses this.

```yaml
# SOURCE: plugins/relay/agents/prd-reviewer.md:6   (canonical tools: field shape)
tools: Read, Edit, Write, Task
# SOURCE: (agent-list registry) plugins/relay/agents/code-reviewer.md:6
tools: Read, Write, Glob, Grep, Bash, BashOutput, Task
```
Comma-separated, unquoted, no brackets. Task 3 adds one `tools:` line to `post-green-reviewer.md` and one to `test-runner.md`, each enumerating the tools that agent's body actually invokes (do not over- or under-list): `post-green-reviewer.md` reads artifacts (`Read`), scans changed test files for removed tests / skip markers (`Grep`), and diffs via `git diff` (`Bash`, `BashOutput`) — recommended `tools: Read, Grep, Bash, BashOutput`; `test-runner.md` reads config/artifacts (`Read`), runs the suite + normalizes via `node scripts/normalize-test-output.mjs` (`Bash`, `BashOutput`), and writes a redacted log (`Write`) — recommended `tools: Read, Write, Bash, BashOutput`. The Implementer MUST confirm the final list against each body before writing it.

```bash
# SOURCE: plugins/relay/skills/context-builder/SKILL.md:417-447   (bash canonical template to mirror into PowerShell)
#!/usr/bin/env bash
# scripts/worktree-bootstrap.sh
# ...
set -euo pipefail
WORKTREE_PATH="${1:?Usage: worktree-bootstrap.sh <absolute-worktree-path>}"
# TODO: Uncomment and adapt — env-file replication
# cp .env.local "${WORKTREE_PATH}/.env.local"
# TODO: Uncomment and adapt — Docker Compose project name override
# FEATURE_SLUG="$(basename "${WORKTREE_PATH}")"
# echo "COMPOSE_PROJECT_NAME=relay-${FEATURE_SLUG}" >> "${WORKTREE_PATH}/.env.local"
# TODO: Uncomment and adapt — dependency install
# cd "${WORKTREE_PATH}" && pnpm install --frozen-lockfile
# TODO: Uncomment and adapt — port allocation
# OFFSET=$(( $(echo -n "${WORKTREE_PATH}" | cksum | cut -d' ' -f1) % 1000 ))
```
Task 6 adds a PowerShell sibling (`scripts/worktree-bootstrap.ps1`) with the same four TODO blocks and behavioral parity, e.g.:
```powershell
# scripts/worktree-bootstrap.ps1
#
# Generated by relay context-builder — project-owned, edit freely.
# Source PRD: PRPs/prds/relay-worktree.prd.md
# Invoked by /relay-worktree as: scripts/worktree-bootstrap.ps1 <absolute-worktree-path>
# Timeout: 60 seconds (relay default, D9). $WorktreePath = absolute path to the new worktree.
param([Parameter(Mandatory=$true)][string]$WorktreePath)
$ErrorActionPreference = 'Stop'
# TODO: Uncomment and adapt — env-file replication
# Copy-Item .env.local (Join-Path $WorktreePath '.env.local')
# TODO: Uncomment and adapt — Docker Compose project name override
# $FeatureSlug = Split-Path $WorktreePath -Leaf
# "COMPOSE_PROJECT_NAME=relay-$FeatureSlug" | Add-Content (Join-Path $WorktreePath '.env.local')
# TODO: Uncomment and adapt — dependency install
# Push-Location $WorktreePath; pnpm install --frozen-lockfile; Pop-Location
# TODO: Uncomment and adapt — port allocation
# $offset = [System.BitConverter]::ToUInt32([System.Security.Cryptography.MD5]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes($WorktreePath)),0) % 1000
```
The `## Sub-step B` prose (Init / Update / HALT behavior + Final Report bullets) must also be extended to emit and preserve the `.ps1` alongside the `.sh` (the parity the `/relay-worktree` command depends on when it runs `.sh` **or** `.ps1`).

```
# SOURCE: documentation/changelog.html:31-46   (Unreleased + release-block shape)
<h2 id="unreleased">Unreleased</h2>
<h2 id="v0-20-0">0.20.0 &#8212; 2026-07-12</h2>
<p>Ships the rendered documentation-site reference page...</p>
<h3 id="v0-20-0-added">Added</h3>
```
Task 8 adds a `<h3 id="unreleased-fixed">Fixed</h3><ul>…</ul>` block UNDER the existing `<h2 id="unreleased">Unreleased</h2>` stub (NOT a new `<h2>` release — that would break check B version-parity). CRITICAL: the new entry must refer to the old commands WITHOUT a leading slash (e.g. "the former `relay-tdd` / `relay-tdd-review` commands"), because check C anchors on the `(?<!\w)/relay-tdd` slash token — writing `/relay-tdd` in the entry would re-introduce the exact stale finding this phase removes.

```json
# SOURCE: documentation/assets/data/search-index.json   (page-object shape; Agents excerpt currently names the stale agents)
{ "title": "Agents", "path": "reference/agents.html", "category": "Reference",
  "excerpt": "...implementer, code-reviewer, code-reviewer-semantic, tdd-writer, tdd-reviewer, docs-updater ..." }
```
Task 7 (a) rewrites the Agents-page excerpt's `tdd-writer, tdd-reviewer` → `test-writer, test-reviewer` (clears the two agent findings — whole-word match), and (b) enriches the Commands-page excerpt to mention the six missing commands as `/relay-execute`, `/relay-plan-review`, `/relay-code-review`, `/relay-worktree`, `/relay-write-test`, `/relay-test-write-review` (clears the six command findings — `/relay-<name>` match). The file must remain valid JSON and each `category` must still match its NAV heading.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/agents/prd-reviewer.md` | UPDATE | Quote the malformed `description:` YAML scalar (check A error; loads with empty metadata at runtime) |
| `plugins/relay/commands/relay-plan.md` | UPDATE | Quote the malformed `description:` YAML scalar (check A error) |
| `plugins/relay/commands/relay-write-test.md` | UPDATE | Quote the malformed `description:` YAML scalar (check A error) |
| `plugins/relay/commands/dogfood/dogfood-A.md` | DELETE | Leftover synthetic dogfood fixture with no frontmatter → check A `--strict` warning; not a shipped command |
| `plugins/relay/commands/dogfood/dogfood-B.md` | DELETE | Same — synthetic dogfood fixture |
| `plugins/relay/commands/dogfood/dogfood-file-1.md` | DELETE | Same — synthetic dogfood fixture |
| `plugins/relay/commands/dogfood/dogfood-file-2.md` | DELETE | Same — synthetic dogfood fixture |
| `plugins/relay/agents/post-green-reviewer.md` | UPDATE | Add the required `tools:` frontmatter field (check F) |
| `plugins/relay/agents/test-runner.md` | UPDATE | Add the required `tools:` frontmatter field (check F) |
| `docs/api-reference.md` | UPDATE | Line 120 `scripts/normalize-test-output.py`→`.mjs` (check D); lines 61 & 68 current-facing `/relay-tdd`→`/relay-write-test`, `/relay-tdd-review`→`/relay-test-write-review` (hole #1 current-facing refs) |
| `PRPs/plans/test-pair-universalization-phase-1-rename-behavior-preserving.review.jsonl` | UPDATE | Append the doubled file's APPROVED (final_flip) record so both verdicts are preserved chronologically |
| `PRPs/plans/test-pair-universalization-phase-1-rename-behavior-preserving.plan.review.jsonl` | DELETE | The mis-named doubled-`.plan` artifact (check G) — deleted AFTER its record is merged into the correct sibling |
| `plugins/relay/skills/context-builder/SKILL.md` | UPDATE | Add the `worktree-bootstrap.ps1` canonical template + Init/Update/HALT emission behavior (check P) |
| `documentation/assets/data/search-index.json` | UPDATE | Add 6 missing command mentions + rename 2 stale agent names (check C) |
| `documentation/changelog.html` | UPDATE | Remove 2 stale `/relay-tdd` slash tokens (check C) + add the mandatory `Unreleased`/`Fixed` entry (AGENTS.md §6/§7) |
| `documentation/reference/commands.html` | UPDATE | Rename stale `/relay-tdd` command headings/anchors + intra-page hrefs to current names (site consistency) |
| `documentation/reference/agents.html` | UPDATE | Rename stale `tdd-writer`/`tdd-reviewer` + `/relay-tdd` references to current names |
| `documentation/concepts/tdd-track.html` | UPDATE | Rename stale command/agent references |
| `documentation/concepts/pipeline.html` | UPDATE | Rename stale command references in the pipeline diagram |
| `documentation/concepts/interactivity-boundary.html` | UPDATE | Rename stale command references |
| `documentation/guide/handling-failures.html` | UPDATE | Rename stale command/agent references |
| `documentation/roadmap/status.html` | UPDATE | Rename stale command references |
| `documentation/roadmap/test-runner-prd.html` | UPDATE | Rename stale command references |

## NOT Building (Scope Limits)

- **`docs/decisions.md` is NOT edited.** Every `relay-tdd`/`tdd-writer` occurrence there sits inside a dated, historical decision entry (e.g. the [2026-04-19] command-surface table at lines 200-217; the canonical rename decision at line 696 that legitimately names both old and new). Rewriting a dated decision record falsifies history; the current names are already documented in the line-696 rename decision. No validation check scans `docs/decisions.md`, so leaving it does not affect green.
- **`docs/domain/glossary.md` is NOT edited.** Lines 104-105 already read "`test-writer` and `test-reviewer` (formerly `tdd-writer` / `tdd-reviewer`)" — current names with a correct historical attribution. `docs/api-reference.md:138` is likewise already correct ("formerly `tdd-writer`/`tdd-reviewer`") and is left as-is.
- **No new validation check.** Phase 3 fixes findings; it does not add checks (H/I/markdownlint are deferred Coulds per the PRD).
- **No pre-commit hook.** `.githooks/pre-commit` + `npm run setup-hooks` implementation is Phase 4.
- **No eval layer.** `promptfooconfig.yaml` + `npm run eval` is Phase 5.
- **No release cut / no plugin.json bump.** Changes go under the existing `Unreleased` block; version-parity (check B) must stay green. Cutting a release or bumping the manifest is out of scope (and would require the §7.5 lock-step bump).
- **No NAV (`assets/js/app.js`) change.** No page is added, removed, or renamed — only page CONTENT and the search-index excerpts change; NAV stays byte-identical.
- **No new tests.** Under `tdd: false` + `test_frameworks: ["node:test"]` (test-after, R-X strict) the Implementer authors ZERO test files. This phase adds no new testable code unit, so the test pair authors ZERO new tests — the existing Phase 2 checker `*.test.mjs` already cover the checks and continue to pass.

## Step-by-Step Tasks

### Task 1: UPDATE the three malformed YAML frontmatter descriptions (check A errors)

- **AC**: AC-A6 (PRD AC-9 native-validate wrap) — fixes the three `YAML frontmatter failed to parse` errors.
- **ACTION**: In `plugins/relay/agents/prd-reviewer.md` (line 3), `plugins/relay/commands/relay-plan.md` (line 2), and `plugins/relay/commands/relay-write-test.md` (line 2), wrap the entire `description:` value in double quotes so the embedded `: ` (colon-space) sequences are literal and a real YAML parser accepts them. Escape any embedded `"` as `\"` (none present in the current values). Change ONLY the quoting — preserve the description text verbatim.
- **MIRROR**: Patterns-to-Mirror `# SOURCE: plugins/relay/agents/prd-reviewer.md:3` (the malformed anti-pattern + the double-quote fix).
- **VALIDATE**:
  ```sh
  claude plugin validate ./plugins/relay --strict 2>&1 | tee /tmp/nv.txt; \
  if grep -qE "prd-reviewer\.md|relay-plan\.md|relay-write-test\.md" /tmp/nv.txt && grep -q "failed to parse" /tmp/nv.txt; then \
    echo "FAIL: a target file still fails YAML parse"; exit 1; else echo "PASS: three descriptions parse"; fi
  ```

### Task 2: DELETE the four synthetic dogfood command fixtures (check A --strict warnings)

- **AC**: AC-A6 (PRD AC-9 native-validate wrap) — clears the four `No frontmatter block found` `--strict` warnings.
- **ACTION**: Remove `plugins/relay/commands/dogfood/dogfood-A.md`, `dogfood-B.md`, `dogfood-file-1.md`, and `dogfood-file-2.md` (and the now-empty `plugins/relay/commands/dogfood/` directory). Rationale (record in the commit body): they are leftover synthetic no-op fixtures created by past orchestrator/worktree dogfood runs to test `/relay-execute`; they are not shipped commands, and their generating PRDs/plans remain under `PRPs/` as history (not scanned by check A). Removal is the cleanest of the three options (remove / exclude / add-frontmatter): "exclude" is impossible (the native `claude plugin validate` scans the whole plugin tree and cannot be told to skip a subdir), and "add minimal frontmatter" would ship four meaningless no-op commands to users.
- **MIRROR**: N/A (deletion).
- **VALIDATE**:
  ```sh
  if [ -d plugins/relay/commands/dogfood ]; then echo "FAIL: dogfood fixtures still present"; exit 1; else echo "PASS: dogfood fixtures removed"; fi
  ```

### Task 3: UPDATE post-green-reviewer.md and test-runner.md — add the required `tools:` field (check F)

- **AC**: AC-A4 (PRD AC-7 frontmatter-schema) — clears both `must have required property 'tools'` findings.
- **ACTION**: Add one `tools:` line to each agent's frontmatter block, enumerating the tools its body actually invokes (comma-separated, unquoted, no brackets — mirroring the canonical shape). Recommended after confirming against each body: `post-green-reviewer.md` → `tools: Read, Grep, Bash, BashOutput`; `test-runner.md` → `tools: Read, Write, Bash, BashOutput`. Place the line inside the existing `---`…`---` fence (e.g. after `color:`). Do not alter any other frontmatter field.
- **MIRROR**: Patterns-to-Mirror `# SOURCE: plugins/relay/agents/prd-reviewer.md:6` / `code-reviewer.md:6` (canonical `tools:` field shape).
- **VALIDATE**:
  ```sh
  if grep -qE "^tools:[[:space:]]*\S" plugins/relay/agents/post-green-reviewer.md \
     && grep -qE "^tools:[[:space:]]*\S" plugins/relay/agents/test-runner.md; then \
    echo "PASS: both agents carry a non-empty tools: field"; else \
    echo "FAIL: a tools: field is missing or empty"; exit 1; fi
  ```

### Task 4: UPDATE docs/api-reference.md — fix the dangling `.py` reference + current-facing stale command names

- **AC**: AC-A5 (PRD AC-5 path-existence) for the `.py`→`.mjs` fix; hole #1 current-facing refs for the command renames.
- **ACTION**: (a) Line 120: change `scripts/normalize-test-output.py` → `scripts/normalize-test-output.mjs` (the real on-disk file; check D dangling reference). (b) Line 61: `symmetric with `/relay-tdd` P4.a` → `/relay-write-test`. (c) Line 68: the `/relay-execute` compose string `... → /relay-tdd → /relay-tdd-review → ...` → `... → /relay-write-test → /relay-test-write-review → ...`. Leave line 138's "formerly `tdd-writer`/`tdd-reviewer`" attribution unchanged (correct as-is).
- **MIRROR**: N/A (surgical string fixes; grounded on the check D module header and the docs/decisions.md:696 rename mapping).
- **VALIDATE**:
  ```sh
  if grep -qn "normalize-test-output\.py" docs/api-reference.md; then echo "FAIL: .py reference remains"; exit 1; fi; \
  if grep -qnE "/relay-tdd" docs/api-reference.md; then echo "FAIL: stale /relay-tdd slash reference remains in api-reference.md"; exit 1; fi; \
  echo "PASS: api-reference.md path + current command names fixed"
  ```

### Task 5: RECONCILE the doubled-`.plan` review-log artifact (check G)

- **AC**: AC-A7 (PRD AC-8 artifact-naming) — clears the doubled `.plan.review.jsonl` finding without losing history.
- **ACTION**: Append the single APPROVED (`"action": "final_flip"`) record currently in `PRPs/plans/test-pair-universalization-phase-1-rename-behavior-preserving.plan.review.jsonl` to the end of the correctly-named sibling `PRPs/plans/test-pair-universalization-phase-1-rename-behavior-preserving.review.jsonl` (which currently holds only the earlier CHANGES_REQUESTED record) — producing a two-line chronological verdict log (CHANGES_REQUESTED then APPROVED, both timestamped 2026-07-09). Then delete the doubled-name file. Do NOT clobber: the correct sibling already exists with DIFFERENT content, so this is a merge, not a rename.
- **MIRROR**: N/A (JSONL append + delete; both files' contents were read during grounding).
- **VALIDATE**:
  ```sh
  if ls PRPs/plans/*.plan.review.jsonl PRPs/plans/*.plan.code-review.jsonl PRPs/plans/*.plan.test-write-review.jsonl 2>/dev/null | grep -q .; then \
    echo "FAIL: a doubled .plan review-log artifact still exists"; exit 1; fi; \
    lines=$(wc -l < PRPs/plans/test-pair-universalization-phase-1-rename-behavior-preserving.review.jsonl); \
    if [ "$lines" -lt 2 ]; then echo "FAIL: APPROVED record was not merged into the correct sibling"; exit 1; fi; \
    echo "PASS: artifact reconciled (doubled file gone, both verdicts preserved)"
  ```

### Task 6: UPDATE SKILL.md — add the `worktree-bootstrap.ps1` canonical template + emission behavior (check P)

- **AC**: AC-A8 (PRD AC-13 `.sh`/`.ps1` bootstrap parity) — clears the bootstrap-parity finding; delivers real Windows parity (hole #5).
- **ACTION**: In `plugins/relay/skills/context-builder/SKILL.md` Phase 1.8, add a PowerShell canonical template (`scripts/worktree-bootstrap.ps1`) mirroring the existing bash template's four TODO blocks (env-file replication, Docker Compose project-name override, dependency install, port allocation) with `param([Parameter(Mandatory=$true)][string]$WorktreePath)` + `$ErrorActionPreference = 'Stop'`, and extend the Sub-step B Init / [R] Recreate / Update / HALT behavior and Final-Report bullets so the context-builder emits and preserves BOTH `worktree-bootstrap.sh` and `worktree-bootstrap.ps1` (behavioral parity — the `/relay-worktree` command runs `.sh` or `.ps1`). Consider retitling the Sub-step to name both scripts. The `worktree-bootstrap.ps1` filename token MUST appear in the file.
- **MIRROR**: Patterns-to-Mirror `# SOURCE: plugins/relay/skills/context-builder/SKILL.md:417-447` (bash template) → PowerShell sibling.
- **VALIDATE**:
  ```sh
  if grep -q "worktree-bootstrap\.ps1" plugins/relay/skills/context-builder/SKILL.md \
     && grep -q "worktree-bootstrap\.sh" plugins/relay/skills/context-builder/SKILL.md; then \
    echo "PASS: SKILL.md emits both .sh and .ps1 bootstrap templates"; else \
    echo "FAIL: .ps1 template token missing from SKILL.md"; exit 1; fi
  ```

### Task 7: UPDATE search-index.json — add 6 missing commands + rename 2 stale agents (check C, search-index surface)

- **AC**: AC-A1 (PRD AC-4 three-file registration) — clears the eight search-index findings.
- **ACTION**: In `documentation/assets/data/search-index.json`: (a) in the Agents-page object's `excerpt`, replace `tdd-writer, tdd-reviewer` with `test-writer, test-reviewer` (clears the two agent findings via whole-word match); (b) enrich the Commands-page object's `excerpt` so it mentions all six currently-missing commands as slash tokens: `/relay-execute`, `/relay-plan-review`, `/relay-code-review`, `/relay-worktree`, `/relay-write-test`, `/relay-test-write-review`. Keep the file valid JSON; keep each `category` matching its NAV heading. (This is a documentation/ change — governed by AGENTS.md; the coupled changelog entry is added in Task 8.)
- **MIRROR**: Patterns-to-Mirror `# SOURCE: documentation/assets/data/search-index.json` (page-object shape).
- **VALIDATE**:
  ```sh
  node -e "JSON.parse(require('fs').readFileSync('documentation/assets/data/search-index.json','utf8'))" || { echo "FAIL: search-index.json is not valid JSON"; exit 1; }; \
  node -e "import('./scripts/validate/checks/registration-parity.mjs').then(m=>{const r=m.runRegistrationParityCheck(); const bad=r.findings.filter(f=>f.file&&f.file.includes('search-index.json')); if(bad.length){console.error('FAIL: '+bad.length+' search-index findings remain'); process.exit(1);} console.log('PASS: search-index registration clean');})"
  ```

### Task 8: UPDATE changelog.html + the 9 site pages — kill stale `/relay-tdd` tokens + add the mandatory changelog entry (check C, changelog surface + AGENTS.md)

- **AC**: AC-A1 (PRD AC-4 three-file registration) — clears the two `changelog.html references "/relay-tdd"` findings; satisfies the AGENTS.md §6/§7 mandatory changelog entry.
- **ACTION**: (a) In `documentation/changelog.html`, rename the two stale current-command slash tokens `/relay-tdd` → `/relay-write-test` and `/relay-tdd-review` → `/relay-test-write-review` (visible text; `<code>` wrappers are fine) so no `(?<!\w)/relay-tdd` token remains in the rendered text. (b) Add a `<h3 id="unreleased-fixed">Fixed</h3>` block UNDER the existing `<h2 id="unreleased">Unreleased</h2>` stub (NOT a new `<h2>` release — that would break version-parity), documenting: the search-index sync + the site-wide rename to the current test-pair command/agent names + the `.py`→`.mjs` api-reference fix. CRITICAL: in this new entry, name the old commands WITHOUT a leading slash (e.g. "the former `relay-tdd` / `relay-tdd-review` commands") so the entry does not re-introduce the `/relay-tdd` token check C flags. (c) For internal site consistency, rename the stale `/relay-tdd`→`/relay-write-test`, `/relay-tdd-review`→`/relay-test-write-review`, `tdd-writer`→`test-writer`, `tdd-reviewer`→`test-reviewer` references across the nine affected pages (`reference/commands.html`, `reference/agents.html`, `concepts/tdd-track.html`, `concepts/pipeline.html`, `concepts/interactivity-boundary.html`, `guide/handling-failures.html`, `roadmap/status.html`, `roadmap/test-runner-prd.html`, and the changelog itself), updating any `id="relay-tdd*"` anchors and intra-site hrefs that point at them (AGENTS.md §9). No emojis, no new CSS/JS, relative paths only.
- **MIRROR**: Patterns-to-Mirror `# SOURCE: documentation/changelog.html:31-46` (Unreleased + release-block shape).
- **VALIDATE**:
  ```sh
  if grep -rnE "/relay-tdd" documentation/; then echo "FAIL: a stale /relay-tdd slash token remains in the doc site"; exit 1; fi; \
  if ! grep -q "unreleased-fixed" documentation/changelog.html; then echo "FAIL: mandatory Unreleased/Fixed changelog entry missing"; exit 1; fi; \
  node -e "import('./scripts/validate/checks/registration-parity.mjs').then(m=>{const r=m.runRegistrationParityCheck(); if(!r.ok){console.error('FAIL: registration-parity still failing');process.exit(1);} console.log('PASS: registration-parity green');})"
  ```

### Task 9: INTEGRATION GATE — `npm run validate` exits 0 (definition of done)

- **AC**: AC-A9 (PRD AC-2 green on a consistent tree) — the umbrella success signal for the whole phase.
- **ACTION**: Run the full suite end-to-end. All 8 registered checks (version-parity, native-validate, registration-parity, path-existence, dispatch-graph, frontmatter-schema, artifact-naming, bootstrap-parity) must PASS and the runner must exit 0. Re-run after any residual finding until green; each finding names its check + `file:line` for targeted fixing.
- **MIRROR**: N/A (integration gate).
- **VALIDATE**:
  ```sh
  npm run validate
  ```

## Validation Commands

Every command below carries real exit-code semantics — it exits non-zero when its invariant is violated (no `<check> && echo PASS || echo FAIL` masking). The `code-reviewer` scores each level PASS iff exit code is 0.

**Level 1 — STATIC_ANALYSIS (native validator + JSON validity + ESM syntax of the checks the fixes depend on)**
```sh
set -euo pipefail
# Native frontmatter/kebab/strict validator must PASS (fixes: 3 quoted descriptions + 4 dogfood removals)
claude plugin validate ./plugins/relay --strict
# search-index.json must remain valid JSON after the Task-7 edit
node -e "JSON.parse(require('fs').readFileSync('documentation/assets/data/search-index.json','utf8'))"
# The two touched checker modules still parse (defensive — this phase does not edit them, but the runner imports them)
node --check scripts/validate/checks/registration-parity.mjs
node --check scripts/validate/checks/native-validate.mjs
echo "Level 1 PASS: native validator green, search-index valid JSON, checker modules parse"
```

**Level 2 — CONTENT_INVARIANTS (each fixed hole asserted individually, scoped to the exact edited files)**
```sh
set -euo pipefail
# check F: both agents carry a non-empty tools: field
grep -qE "^tools:[[:space:]]*\S" plugins/relay/agents/post-green-reviewer.md
grep -qE "^tools:[[:space:]]*\S" plugins/relay/agents/test-runner.md
# check D: no dangling .py reference in api-reference.md
if grep -qn "normalize-test-output\.py" docs/api-reference.md; then echo "FAIL: .py reference remains"; exit 1; fi
# check P: SKILL.md emits the .ps1 template token
grep -q "worktree-bootstrap\.ps1" plugins/relay/skills/context-builder/SKILL.md
# check G: no doubled .plan review-log artifact under PRPs/plans/ (top level)
if ls PRPs/plans/*.plan.review.jsonl PRPs/plans/*.plan.code-review.jsonl PRPs/plans/*.plan.test-write-review.jsonl 2>/dev/null | grep -q .; then echo "FAIL: doubled .plan artifact remains"; exit 1; fi
# check A residue: no dogfood fixtures left
if [ -d plugins/relay/commands/dogfood ]; then echo "FAIL: dogfood fixtures remain"; exit 1; fi
# check C consistency: no stale /relay-tdd slash token in the edited surfaces (scoped to this phase's diff — documentation/ + api-reference.md; decisions.md/glossary.md are intentionally out of scope)
if grep -rnE "/relay-tdd" documentation/ docs/api-reference.md; then echo "FAIL: stale /relay-tdd slash token remains in an edited surface"; exit 1; fi
# AGENTS.md: the mandatory changelog entry exists
grep -q "unreleased-fixed" documentation/changelog.html
echo "Level 2 PASS: every fixed hole's invariant holds"
```

**Level 3 — INTEGRATION (the definition of done: the full suite is green)**
```sh
# npm run validate must exit 0 with all 8 checks passing — the phase Success signal.
# It exits non-zero if ANY check reports a finding (real exit-code semantics, able to fail).
npm run validate
```

## Acceptance Criteria

- **AC-A1 (PRD AC-4):** After the search-index sync (Task 7) and the changelog stale-token removal (Task 8), the `registration-parity` check (C) reports zero findings — all on-disk commands are referenced as `/relay-<name>` in both search-index.json and changelog.html, all on-disk agents (including `test-writer`, `test-reviewer`) appear in both, and no `/relay-tdd`/`/relay-tdd-review` stale token remains. The coupled AGENTS.md three-file rule is honored (search-index + changelog entry; NAV unchanged because no page is added/removed/renamed).
- **AC-A4 (PRD AC-7):** After Task 3, the `frontmatter-schema` check (F) reports zero findings — `post-green-reviewer.md` and `test-runner.md` each carry a non-empty `tools:` field satisfying the agent schema's `required: ["name","description","model","color","tools"]`.
- **AC-A5 (PRD AC-5):** After Task 4, the `path-existence` check (D) reports zero findings — `docs/api-reference.md` no longer references the non-existent `scripts/normalize-test-output.py`.
- **AC-A6 (PRD AC-9):** After Tasks 1 and 2, the `native-validate` check (A) — `claude plugin validate ./plugins/relay --strict` — exits 0: the three previously-unparseable frontmatter descriptions parse, and no `--strict` no-frontmatter warnings remain (dogfood fixtures removed).
- **AC-A7 (PRD AC-8):** After Task 5, the `artifact-naming` check (G) reports zero findings — no `PRPs/plans/*.plan.(review|code-review|test-write-review).jsonl` file exists; the doubled artifact's APPROVED verdict is preserved (merged into the correctly-named `.review.jsonl`).
- **AC-A8 (PRD AC-13):** After Task 6, the `bootstrap-parity` check (P) reports zero findings — `plugins/relay/skills/context-builder/SKILL.md` emits a `worktree-bootstrap.ps1` template alongside the `.sh` one, with Init/Update/HALT emission parity.
- **AC-A9 (PRD AC-2):** After all tasks, `npm run validate` exits 0 with all 8 checks passing (`version-parity`, `native-validate`, `registration-parity`, `path-existence`, `dispatch-graph`, `frontmatter-schema`, `artifact-naming`, `bootstrap-parity`) — the phase's definition of done. (Reintroducing any violation makes the runner exit non-zero, per PRD AC-1 / AC-11 semantics validated in later phases.)

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Over-broad grep in the site-consistency rename false-positives on legitimate pre-existing content (prior art: the relay-execute docs-phase Level-3 grep false positives — see MEMORY) | M | M | Every Level-2 grep is scoped to the exact files this phase edits (`documentation/` + `docs/api-reference.md`), never a broad `docs/` sweep; `docs/decisions.md` (which legitimately contains `/relay-tdd` in historical entries) is explicitly excluded from the grep scope and from the edit set |
| The new changelog `Fixed` entry re-introduces a `/relay-tdd` slash token and re-triggers check C | M | M | Task 8 mandates naming old commands WITHOUT a leading slash ("the former `relay-tdd` / `relay-tdd-review` commands"); the Level-2 `grep -rnE "/relay-tdd" documentation/` gate catches any slip |
| Adding a `tools:` line that under-lists an agent's real tools silently breaks the agent at runtime | M | M | Task 3 instructs the Implementer to enumerate tools from each agent's body (not guess) and gives a grounded recommendation per agent; the field is validated non-empty by check F and the body-derivation is a stated requirement |
| Deleting the dogfood fixtures breaks a live reference | L | M | Grounding confirmed the only references are in the fixtures' own generating PRDs/plans under `PRPs/` (history, not live dependencies) and prose mentions of the dogfood *process*; no active command/agent/site path loads `commands/dogfood/*.md` |
| Accidentally cutting a new changelog release or bumping plugin.json would break version-parity (check B) | L | H | Task 8 explicitly adds under the existing `Unreleased` block (skipped by check B) and NOT Building forbids a release cut / plugin bump; Level-1 runs the native validator and Level-3 `npm run validate` would turn red on any parity break |
| The double-quote YAML fix leaves an embedded `"` or backslash unescaped | L | M | Task 1 VALIDATE re-runs `claude plugin validate --strict` and greps for `failed to parse` on the three files; grounding confirmed the current values contain no `"` or `\` |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- **Concretely for this phase:** `test_frameworks: ["node:test"]` IS declared, so the pair is ACTIVE — but this phase adds NO new testable code unit (it is content/config fixes to make the already-built Phase 2 checks pass). The Implementer authors production/content ONLY and ZERO test files (R-X strict). The test pair therefore authors ZERO new tests this phase; the existing `scripts/validate/**/*.test.mjs` (from Phases 1-2) already cover the checks and continue to pass under `/relay-test` via `node --test`.
- **Why the documentation/ site is edited but docs/decisions.md is not:** the site is the rendered mirror that must reflect CURRENT command/agent names, and check C gates `changelog.html`/`search-index.json`; `docs/decisions.md` occurrences are all inside dated historical decision entries (including the canonical rename decision at line 696) that would be falsified by rewriting, and no check scans it. This asymmetry is deliberate and recorded in NOT Building.
- **Version-parity safety:** all site changes go under the existing `<h2 id="unreleased">` block, which check B skips — so no plugin.json bump is needed and version-parity stays green (AGENTS.md §7.3/§7.5).
- **Grounding provenance:** the six failing checks and their exact `file:line` findings were captured by running `npm run validate` on the current tree during planning (node v24, node_modules present, `claude` CLI present so check A fires); the artifact merge order (CHANGES_REQUESTED then APPROVED) and the three malformed YAML lines were read directly.

*Generated: 2026-07-13*
*Approved: 2026-07-13*
*Implemented: 2026-07-13*
*Status: IMPLEMENTED*
