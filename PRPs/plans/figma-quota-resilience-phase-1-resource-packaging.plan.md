# Feature: Resource packaging (Phase 1 of figma-quota-resilience)

```
**Decision Gate**
- Active context: none
- Activated criteria: new/moved resource files under `plugins/relay/` (new artifact-location convention); cross-cutting artifact creation (`scripts/validate/checks/plugin-root-resolvable.mjs` + a `CHECKS` registry change); impacts the plugin's own packaging/install surface; `documentation/` site changes requiring the three-file registration + version-parity lock-step contract
- Decisions found:
  - [2026-04-19] Distribute via Claude Code marketplace (single-plugin repo) — plugin install copies `plugins/relay/`'s own directory tree verbatim into the versioned cache; there is no packaging manifest field to declare included/excluded files, so any file an installed agent must read has to physically live inside `plugins/relay/`. This is the root fact the whole phase corrects for.
  - [2026-04-19] Keep upstream `prp-core` as reference, not as active relay code — bears on Task 6 (the C6 reference class), which touches a `plugins/prp-core/commands/prp-commit.md` citation in `relay-commit.md`; the citation may remain as a reference pointer but must never be rewritten to imply `prp-core` is packaged or active relay code.
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/` — general boundary bounding every write this phase performs; no task in this phase writes under `.claude/`.
- Applicable anti-patterns:
  - "Writing pipeline artifacts under `.claude/`" (`docs/anti-patterns.md`) — every write in this phase targets `plugins/relay/`, `docs/`, or `documentation/`; none targets `.claude/`.
  - "Treating `plugins/prp-core/` as active relay code" (`docs/anti-patterns.md`) — bounds Task 6's handling of the one `prp-core` citation.
  - The R-X strict carve-out under "Weakening or deleting tests..." (`docs/anti-patterns.md`; `docs/decisions.md` [2026-05-06]) — the 55 hardcoded path constants across 8 existing test files, and the new check's own unit test, are explicitly OUT of this plan's Step-by-Step Tasks; both are test-file edits/creations that must be routed through the test-writer/test-reviewer pair's lifecycle ledger, never authored by the Implementer.
- Applicable architectural rules:
  - `docs/context/architecture.md`'s plugin-layout description, corroborated by `PRPs/reports/plugin-root-audit/relay-plugin-root-audit.md` §5 and external research (Claude Code's own plugin docs list no manifest `files`/`include`/`exclude` field) — `${CLAUDE_PLUGIN_ROOT}` resolves to the installed `plugins/relay/` directory only; a resource any installed agent must read has to physically live inside it.
  - `documentation/AGENTS.md` §7.5 — a minor/major `documentation/changelog.html` release cut MUST bump `plugins/relay/.claude-plugin/plugin.json`'s version in the same commit; enforced mechanically by the `version-parity` check.
  - `documentation/AGENTS.md` §6 — every new/changed documentation-site page stays registered across NAV, the search index, and the changelog (the three-file rule).
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/figma-quota-resilience.prd.md` — Implementation Phases row 1:
  "Resource packaging" — Goal: The 8 plugin-owned resources reach
  installed users, so every agent's mandatory template read resolves
  outside this repo — Success signal: `npm run validate` reports
  12/12; the full corpus passes; `ls
  ~/.claude/plugins/cache/relay-marketplace/relay/<new-version>/resources/`
  lists all 8 files.

## Summary

Move the 8 plugin-owned resource templates (`prd-template.md`,
`plan-template.md`, `design-spec-template.md`,
`component-map-template.md`, `redaction-policy.md`,
`settings-allowlist.md`, `test-output-schema.md`,
`mock-sentinels.md`) from `docs/context/` — which is never packaged
into an installed plugin — into a new `plugins/relay/resources/`
directory, rewrite every reference to them across roughly two dozen
agent/command/skill/doc files (five distinct severity-driven
rewrite classes), extend the `npm run validate` suite so this class
of defect can never regress silently (one existing check gains a
prefix; one new check closes the remaining blind spot), and give the
two agents most exposed to an unreadable template
(`design-map-writer`, `design-spec-writer`) an explicit named
failure path instead of silent improvisation. This phase absorbs
`PRPs/reports/plugin-root-audit/fix-plan.md`'s F2–F6 (F0/F1 already
shipped in commit `9857be0`) as its authoritative, already-verified
scope.

## User Story

As a relay operator installing the plugin from the marketplace,
I want to have every plugin-owned template the agents depend on physically ship inside the installed plugin directory,
So that `design-map-writer`, `design-spec-writer`, `prd-writer`, `plan-writer`, and every other consumer can read their mandatory template on the very first run, without relying on the accident that this repository is both the plugin's source and its own dogfooding target.

## Problem Statement

The 8 plugin-owned resource templates under `docs/context/` are
unreachable from every installed instance of the plugin —
`${CLAUDE_PLUGIN_ROOT}` resolves to `plugins/relay/` only, and
`docs/` was never packaged (`git log --all -- plugins/relay/docs`
returns nothing, in any commit). Every agent whose Hard Constraint 1
says "load the template first" either halts or improvises when that
`Read` fails, and the two agents most exposed today
(`design-map-writer`, `design-spec-writer`) currently have no named
failure path for that case at all — only a rule about what to do
once the file IS read. The gap has been latent for five plugin
releases because this repository is simultaneously the plugin's
source AND its own dogfooding target: a bare
`docs/context/plan-template.md` reference resolves correctly here
and nowhere else.

## Solution Statement

Move the 8 resources into a new `plugins/relay/resources/`
directory — a name deliberately distinct from `docs/`, so the
packaged/target-scoped distinction becomes mechanically checkable
rather than a naming coincidence that happened to work in one
environment. Rewrite every reference across the ~25 files that cite
them, in five severity-driven classes (`${CLAUDE_PLUGIN_ROOT}`-prefixed,
bare, `PRPs/`-prefixed or target-PRD-provenance, out-of-root, and
line-pinned target-doc citations). Extend the validation suite so
the class can never regress silently: `path-existence.mjs` gains a
`resources/` allowed prefix, and a new, narrower
`plugin-root-resolvable.mjs` check closes the two blind spots
`path-existence.mjs` structurally cannot cover (a bare,
un-prefixed mention of one of the 8 resource basenames anywhere
under `plugins/relay/`, and a literal `plugins/relay/…` string
leaking into the packaged tree itself). Finally, give
`design-map-writer` and `design-spec-writer` — the two agents whose
own Hard Constraint 1 already says "load the template first, missing
section is a bug" but never names what happens if the `Read` itself
fails — an explicit, named halt for that case.

## Metadata

| Key | Value |
|-----|-------|
| Type | Refactor / packaging fix |
| Complexity | Medium — mechanical but wide (per the PRD's own Technical Approach: a file move plus ~134 reference rewrites plus 55 hardcoded test-path constants, whose only true verification lives outside the repo) |
| Systems Affected | Plugin resource packaging (`plugins/relay/`); the `npm run validate` static-check suite (`scripts/validate/`); the `docs/` knowledge base; the `documentation/` site |
| Dependencies | None — Implementation Phases row 1, `Depends: -` |
| Estimated Tasks | 14 |
| Source PRD line ref | `PRPs/prds/figma-quota-resilience.prd.md:198` (Implementation Phases row 1) |
| phase_type | refactor |

(`design_source` / `phase_scope` rows are not added: this repository's
`docs/context/methodology.md` does not declare `figma_track`, and the
source PRD has no `## Visual-First Mode` section — both conditional
rows are correctly absent, and no `## Design Source` section follows
this table.)

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `PRPs/reports/plugin-root-audit/fix-plan.md` | whole file | Primary source: the already-verified scope (F2–F6), the exact severity-class reference counts, the four "what NOT to do" prohibitions this plan's tasks implement, and the seven corrections (§0) that supersede the raw audit below it. |
| P0 | `PRPs/reports/plugin-root-audit/relay-plugin-root-audit.md` | whole file | Underlying audit — the full per-reference enumeration (file:line) for every rewrite class (C1–C7) cited by `fix-plan.md`, and the rationale for the `resources/` naming choice and the rejected alternatives (§6). |
| P1 | `docs/context/conventions.md` | 1–99 | Current 9-section structure; determines where Task 1's new resource-reference-class section is inserted. |
| P1 | `scripts/validate/checks/path-existence.mjs` | 31–35, 61–74, 95–116 | The exact extension points (`CLAUDE_PLUGIN_ROOT_ALLOWED_PREFIXES`, the stale "KNOWN DEFERRED GAP" comment) and the `{name, ok, findings}` contract the new check (Task 11) must mirror. |
| P1 | `scripts/validate/index.mjs` | 19–51 | Import + `CHECKS` array registration pattern Task 11's registration must follow exactly; confirms the current count is 11. |
| P2 | `plugins/relay/agents/design-map-writer.md` | 41–51 | Hard Constraint 1 text to extend with a failure-path branch (Task 13). |
| P2 | `plugins/relay/agents/design-spec-writer.md` | 62–67 | Hard constraint 1 text to extend with a failure-path branch (Task 13). |
| P2 | `documentation/AGENTS.md` | 332–380 | §7.5 plugin-manifest version-sync rule and its exact changelog entry template (Task 14). |
| P2 | `docs/context/constraints.md` | 96–124 | The `gating-structure`/`feedback-chain` precedent for deferring `reference/validation-checks.html`'s new-check catalog section until the check's own unit tests exist (bounds Task 12's scope). |

## Patterns to Mirror

# SOURCE: docs/context/conventions.md:64-73
```
## Hooks

- Configured in `plugins/<plugin>/hooks/hooks.json` under a top-level `hooks`
  key, with one array per event (`Stop`, `PostToolUse`, etc.).
- Scripts are referenced via `${CLAUDE_PLUGIN_ROOT}` to stay portable across
  installations:
  ```json
  { "type": "command", "command": "${CLAUDE_PLUGIN_ROOT}/hooks/my-hook.sh" }
  ```
- Hook scripts live alongside `hooks.json` in the same `hooks/` folder.
```
Used by: Task 1 — this is the section-formatting shape (H2 heading,
short prose + bulleted rules, one code fence) the new
"Plugin-owned resource references" section should match.

# SOURCE: scripts/validate/checks/path-existence.mjs:61-74
```
const SCAN_ROOTS = ['plugins/relay', 'docs'];
const CHECK_NAME = 'path-existence';

// scripts/<...> prefixes that name a script relay's prompts describe
// emitting into a TARGET project (never this repo) — excluded from class 1
// so this check never fights check P (bootstrap-parity), which owns the
// worktree-bootstrap.{sh,ps1} parity invariant.
const TARGET_PROJECT_SCRIPT_PREFIXES = ['scripts/worktree-bootstrap.'];

// ${CLAUDE_PLUGIN_ROOT}/<prefix>… prefixes resolved under plugins/relay/ by
// class 2. "hooks/" is deliberately excluded — plugins/relay/hooks/ is a
// planned-but-unbuilt tree (docs/context/architecture.md), not a check-D
// target yet.
const CLAUDE_PLUGIN_ROOT_ALLOWED_PREFIXES = ['agents/', 'commands/', 'skills/', '.claude-plugin/', 'scripts/'];
```
Used by: Tasks 3 and 4 — this array is the mechanical definition of
"packaged form", and the rewrites in those two tasks converge on the
`${CLAUDE_PLUGIN_ROOT}/resources/` form this array recognizes once
Task 10 adds `'resources/'`. Task 8 is deliberately NOT in this list:
its own ACTION emits the bare `plugins/relay/resources/<name>.md`
form for files outside the `plugins/relay/` tree, which
`resolveBacktickToken` does not resolve — it only handles
`${CLAUDE_PLUGIN_ROOT}/`-prefixed tokens. Mirror this array for
Tasks 3 and 4; do not treat it as the target form for Task 8.

# SOURCE: scripts/validate/checks/path-existence.mjs:95-116
```
export function checkPathExistence({ references }) {
  if (!references) {
    return {
      name: CHECK_NAME,
      ok: false,
      findings: [{ message: `missing input: reference scan of ${SCAN_ROOTS.join(', ')}`, file: null, line: null }],
    };
  }

  const findings = [];
  for (const ref of references) {
    if (!ref.exists) {
      findings.push({
        message: `dangling reference "${ref.raw}" — resolved path "${ref.resolvedPath}" does not exist on disk`,
        file: ref.file,
        line: ref.line,
      });
    }
  }

  return { name: CHECK_NAME, ok: findings.length === 0, findings };
}
```
Used by: Task 11 — the `{name, ok, findings}` return contract (with
`findings: Array<{message, file, line}>`) the new
`plugin-root-resolvable.mjs` module must export identically.

# SOURCE: scripts/validate/index.mjs:19-51
```
import { runVersionParityCheck } from './checks/version-parity.mjs';
...
import { runTimestampContractCheck } from './checks/timestamp-contract.mjs';
...
const CHECKS = [
  runVersionParityCheck,
  ...
  runTimestampContractCheck,
];
```
Used by: Task 11 — the import-then-append-to-`CHECKS` registration
pattern the new check's registration must follow exactly (11 → 12
entries).

# SOURCE: plugins/relay/agents/design-map-writer.md:45-51
```
### 1. Load the template FIRST

Before writing anything, `Read` `docs/context/component-map-template.md`
in full. It is the authoritative shape for
`docs/design/component-map.md` — every section, column, and marker
described there MUST appear in your output. Do not improvise a
different shape from memory.
```
Used by: Task 13 — this is the exact text gaining a new failure-path
paragraph (and, per Task 4, its own bare-path rewrite to the
packaged form).

# SOURCE: plugins/relay/agents/design-spec-writer.md:64-67
```
1. **Template conformance is non-negotiable.** Every DRAFT must match
   the section order and required sections of
   `${CLAUDE_PLUGIN_ROOT}/docs/context/design-spec-template.md`.
   Missing section = bug.
```
Used by: Task 13 — this is the exact text gaining a new failure-path
sentence (and, per Task 3, its own `${CLAUDE_PLUGIN_ROOT}` prefix
rewrite).

# SOURCE: documentation/AGENTS.md:360-366
```
<li><strong><code>plugins/relay/.claude-plugin/plugin.json</code></strong>
  &mdash; version bumped <code>0.X.Y</code> &rarr; <code>0.A.B</code> to
  match this release; users running <code>/plugin</code> after pulling
  this version will get a fresh <code>relay/0.A.B/</code> cache directory
  with all newly-shipped commands and agents registered.</li>
```
Used by: Task 14 — the exact HTML template for the plugin.json
version-bump changelog line.

# SOURCE: scripts/validate/checks/version-parity.mjs:33-62 (per research-codebase finding)
```
extractLatestChangelogVersion() returns the first non-"unreleased" <h2>
whose trimmed text starts with a version number; a mismatch against
plugins/relay/.claude-plugin/plugin.json's own version fails loud,
naming both versions.
```
Used by: Task 14 — this is what `version-parity` (Level 1's `npm run
validate`) actually parses; the changelog release-cut heading Task 14
writes must take the exact `<h2 id="v...">X.Y.Z — YYYY-MM-DD</h2>`
shape this function expects.

## Files to Change

| File | Action | Justification |
|------|--------|----------------|
| `docs/context/conventions.md` | UPDATE | New section documenting the packaged / target-scoped / source-only-prose / cite-by-title rules (Task 1) |
| `docs/context/{prd-template,plan-template,design-spec-template,component-map-template,redaction-policy,settings-allowlist,test-output-schema,mock-sentinels}.md` | DELETE (via `git mv`) | Move source; no stubs left behind (Task 2) |
| `plugins/relay/resources/{same 8 basenames}` | CREATE (via `git mv`) | Move destination — the physical fix that makes every reference class resolvable post-install (Task 2) |
| `plugins/relay/agents/*.md`, `plugins/relay/commands/*.md`, `plugins/relay/skills/context-builder/SKILL.md` (~20 files; exact set enumerated in `fix-plan.md` §F4 / the audit report §3) | UPDATE | Reference-class rewrites C1 / C3 / C2+C5 / C6 / C7 (Tasks 3–7) |
| `plugins/relay/agents/design-map-writer.md` | UPDATE | Also gains a new failure-path branch on Hard Constraint 1 (Task 13), beyond its reference rewrite (Task 4) |
| `plugins/relay/agents/design-spec-writer.md` | UPDATE | Also gains a new failure-path branch on Hard constraint 1 (Task 13), beyond its reference rewrite (Task 3) |
| `plugins/relay/scripts/visual/capture.mjs`, `plugins/relay/scripts/normalize-test-output.mjs` | UPDATE | Comment / help-text reference rewrites (part of Tasks 3–4) |
| `docs/KNOWLEDGE_BASE.md`, `docs/domain/glossary.md`, `docs/context/architecture.md`, `docs/context/constraints.md`, `docs/api-reference.md`, `README.md` | UPDATE | Repo-root doc-surface reference rewrites (Task 8) |
| `CLAUDE.md` | UPDATE | "11 static consistency checks" → "12" (Task 12) |
| `documentation/README.md`, `documentation/roadmap/status.html`, `documentation/reference/commands.html`, `documentation/reference/agents.html`, `documentation/reference/skills.html`, `documentation/reference/scripts.html`, `documentation/guide/troubleshooting.html`, `documentation/concepts/interactivity-boundary.html` | UPDATE | Site-surface reference rewrites (Task 9) |
| `documentation/guide/validation-suite.html` | UPDATE | "eleven"/"11" static checks → "twelve"/"12" (Task 12) |
| `documentation/changelog.html` | UPDATE | `Unreleased` entry (Task 9) + release-cut rename + plugin.json bump line (Task 14) |
| `scripts/validate/checks/path-existence.mjs` | UPDATE | Add `'resources/'` prefix; delete the stale "KNOWN DEFERRED GAP" paragraph (Task 10) |
| `scripts/validate/checks/plugin-root-resolvable.mjs` | CREATE | New regression-guard check (Task 11) |
| `scripts/validate/index.mjs` | UPDATE | Register the new check, 11 → 12 (Task 11) |
| `plugins/relay/.claude-plugin/plugin.json` | UPDATE | Version bump in lock-step with the changelog release cut (Task 14) |

## NOT Building (Scope Limits)

- Any change to Phases 2–6 of `figma-quota-resilience.prd.md` (scoped-scan
  pre-match, `max_metadata_calls` budget, quota preflight, evidence
  contract, checkpoint/resume, design-spec quota path) — this phase is
  packaging only.
- Editing any `*.test.mjs` file. Neither the 55 hardcoded path constants
  across the 8 existing test files
  (`figma-visual-first-track-phase{1..5}.test.mjs`,
  `figma-track-phase{3,4,5}.test.mjs`) nor a new
  `plugin-root-resolvable.test.mjs` is authored by any task below. Both
  are test-file work routed through the test-writer/test-reviewer pair's
  lifecycle ledger (test-after, per this project's `tdd: false` +
  `test_frameworks: ["node:test"]`) — see `## Notes`.
- Adding a new `documentation/reference/validation-checks.html` catalog
  section, or bumping its summary-table "Totals" line, for
  `plugin-root-resolvable` — deferred until that check's own unit tests
  exist, mirroring the established `gating-structure`/`feedback-chain`
  precedent (`docs/context/constraints.md`).
- Editing `PRPs/reports/plugin-root-audit/fix-plan.md` to mark it
  superseded — see `## Notes` for the scope-decision rationale.
- Rewriting any other historical artifact under `PRPs/plans/completed/`,
  `PRPs/prds/`, `PRPs/reports/`, or `docs/decisions.md`.
- "Fixing" `docs/context/code-review-registries.md` or any of the ~90
  legitimate target-scoped bare `docs/…` references — both are correct
  as-is (the audit's own "NÃO É BUG" section); touching them would be
  the false positive the audit specifically warns against.
- The `${CLAUDE_PLUGIN_DATA}` / `plugins/relay/hooks/` visual-tooling
  dependency-persistence fix (`fix-plan.md` §5, "Workstream separado")
  — an independent workstream, not a path-reference defect.
- Symlinking or wholesale-moving `docs/`/`PRPs/` into `plugins/relay/` —
  both rejected outright by the audit (§6, options B/C/A) for reasons
  unrelated to this phase.
- Actually running `claude plugin marketplace update` +
  `claude plugin update relay` and listing the installed cache — a
  post-merge, human-operated verification step; see `## Notes`.

## Step-by-Step Tasks

### Task 1: UPDATE docs/context/conventions.md

- **ACTION**: Add a new `## Plugin-owned resource references` H2
  section (after `## Hooks`, before `## Documentation files`,
  preserving the file's existing section order) documenting the four
  rules from `fix-plan.md` §F2 / §7-Fase-0 of the audit: (a)
  **packaged** — `${CLAUDE_PLUGIN_ROOT}/{agents,commands,skills,
  .claude-plugin,scripts,resources}/…` must resolve inside
  `plugins/relay/`; (b) **target-scoped** — bare `docs/…` names the
  TARGET project's own copy, never prefix it with
  `${CLAUDE_PLUGIN_ROOT}`; (c) **source-only-prose** —
  repo-source-but-unpackaged content (`PRPs/`, root `docs/` beyond
  `docs/context/`) is cited as prose, never as a resolvable token
  path; (d) target-owned governance docs (`docs/decisions.md`,
  `docs/anti-patterns.md`, `docs/context/architecture.md`) are cited
  by section title, never by line number or date, since the target
  project's own copy carries unrelated content at the same
  line/date.
- **MIRROR**: `docs/context/conventions.md:64-73` (`## Hooks`
  section shape).
- **AC**: Infrastructure/scaffolding — this task documents the four
  resource-reference rules Tasks 3-9 implement; no AC-A item observes
  `conventions.md`'s own section content directly.
- **VALIDATE**:
  ```bash
  set -euo pipefail
  grep -q '^## Plugin-owned resource references' docs/context/conventions.md
  grep -q 'resources/' docs/context/conventions.md
  echo "PASS: new conventions.md section present"
  ```

### Task 2: git mv the 8 resources into plugins/relay/resources/

- **ACTION**: `mkdir -p plugins/relay/resources` then `git mv` all 8
  files from `docs/context/` to `plugins/relay/resources/` in one
  commit, preserving filenames exactly:
  `prd-template.md`, `plan-template.md`, `design-spec-template.md`,
  `component-map-template.md`, `redaction-policy.md`,
  `settings-allowlist.md`, `test-output-schema.md`,
  `mock-sentinels.md`. No stub files left behind at the old
  locations — a stub recreates the exact ambiguity that caused the
  bug (per the PRD's own load-bearing instruction).
- **MIRROR**: `docs/context/conventions.md:64-73` — Task 1's new
  section is what defines and justifies this destination path.
- **AC**: AC-A1 — this task is the file move AC-A1 tests directly
  (all 8 resources present at the new location, zero stubs remaining
  at the old one).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  for f in prd-template plan-template design-spec-template component-map-template redaction-policy settings-allowlist test-output-schema mock-sentinels; do
    test -f "plugins/relay/resources/${f}.md"
    test ! -f "docs/context/${f}.md"
  done
  echo "PASS: all 8 resources moved, no stubs left at the old location"
  ```

### Task 3: Rewrite the ${CLAUDE_PLUGIN_ROOT}/docs/context/ references (class C1, 18 refs)

- **ACTION**: Rewrite every `${CLAUDE_PLUGIN_ROOT}/docs/context/<x>`
  reference to `${CLAUDE_PLUGIN_ROOT}/resources/<x>` across
  `plugins/relay/`. Per the audit's own enumeration (§3, class C1;
  frontmatter + body occurrences), this includes
  `design-spec-writer.md:3,66,324`, `relay-design-spec.md:35`,
  `commands/relay-prd.md:31`, `commands/relay-plan.md:31`,
  `commands/relay-plan-review.md:28`, `skills/context-builder/SKILL.md:112,114,263,310,322`,
  `prd-writer.md:3,13,45,418`, and the remaining sites `fix-plan.md`
  §F4.1 lists. Consult `fix-plan.md`/the audit report for the
  complete, already-verified enumeration rather than re-deriving it.
- **MIRROR**: `scripts/validate/checks/path-existence.mjs:61-74`
  (`CLAUDE_PLUGIN_ROOT_ALLOWED_PREFIXES` — the target form).
- **AC**: AC-A2 — one of the two `plugins/relay/`-scoped rewrite
  classes AC-A2 tests (the `${CLAUDE_PLUGIN_ROOT}/docs/context/` →
  `${CLAUDE_PLUGIN_ROOT}/resources/` form).
- **VALIDATE**:
  ```bash
  if grep -rn '${CLAUDE_PLUGIN_ROOT}/docs/context/' plugins/relay/; then
    echo "FAIL: unrewritten \${CLAUDE_PLUGIN_ROOT}/docs/context/ reference(s) found"; exit 1
  else
    echo "PASS: zero remaining \${CLAUDE_PLUGIN_ROOT}/docs/context/ references"
  fi
  ```

### Task 4: Rewrite the bare docs/context/<resource>.md references (class C3, ~51 refs)

- **ACTION**: Rewrite every bare `docs/context/<one of the 8
  basenames>.md` reference to
  `${CLAUDE_PLUGIN_ROOT}/resources/<basename>.md` across
  `plugins/relay/`, in the priority order `fix-plan.md` §F4.2
  specifies: `design-map-writer.md` → `context-builder/SKILL.md` →
  `design-spec-writer.md` + `visual-verifier.md` + `capture.mjs` →
  `prd-writer.md` → `plan-writer.md` → `test-runner.md` +
  `normalize-test-output.mjs` → the remaining commands. While in
  each file, also: (a) delete the two false `(in the target
  project)` annotations at `relay-implement.md:24` and
  `relay-visual-review.md:25` (they name a location the file does
  not resolve at); (b) fix `skills/context-builder/SKILL.md:322`,
  which writes the literal string `# Full catalog and semantics:
  docs/context/redaction-policy.md` into every generated
  `PRPs/redaction-extensions.txt` — this persisted string must also
  point at the packaged form, or the broken pointer survives inside
  every already-initialized consumer project; (c) when emitting
  `${CLAUDE_PLUGIN_ROOT}/resources/mock-sentinels.md` as a P0
  `## Mandatory Reading` row in `plan-writer.md`'s own generated
  output, append a human-readable gloss, e.g. `` (installed relay
  plugin file) ``, per the audit's H5 design note.
- **MIRROR**: `scripts/validate/checks/path-existence.mjs:61-74`.
- **AC**: AC-A2 — the other `plugins/relay/`-scoped rewrite class
  AC-A2 tests (bare `docs/context/<resource>.md` →
  `${CLAUDE_PLUGIN_ROOT}/resources/<resource>.md`).
- **VALIDATE**:
  ```bash
  if grep -rnE 'docs/context/(prd-template|plan-template|design-spec-template|component-map-template|redaction-policy|settings-allowlist|test-output-schema|mock-sentinels)\.md' plugins/relay/; then
    echo "FAIL: unrewritten bare docs/context/<resource>.md reference found under plugins/relay/"; exit 1
  else
    echo "PASS: zero remaining bare docs/context/<resource>.md references under plugins/relay/"
  fi
  ```

### Task 5: Convert the PRPs-prefixed and bare-PRD references to prose (classes C2+C5, ~25 refs)

- **ACTION**: Convert every `${CLAUDE_PLUGIN_ROOT}/PRPs/…` reference
  (class C2, 14 refs — mostly `${CLAUDE_PLUGIN_ROOT}/PRPs/prds/*.prd.md`
  `See:`-block citations across the 12 command files the audit's BAIXA
  table names) and every bare `PRPs/prds/*.prd.md` provenance mention
  (class C5, including `relay-test.md:24`'s
  `${CLAUDE_PLUGIN_ROOT}/docs/decisions.md`, which names a file with
  two different meanings inside vs. outside this repo) into prose with
  no resolvable token-path form — e.g. `` the source PRD
  `test-runner.prd.md`, in the relay plugin repo (not packaged) ``.
  Never repoint these at `${CLAUDE_PLUGIN_ROOT}/…`; that would keep
  lying, just at a different path. Consult `fix-plan.md` §F4.3 /
  the audit's BAIXA table for the enumerated site list.
- **MIRROR**: `docs/context/conventions.md:64-73` — Task 1's
  source-only-prose rule is what this task implements.
- **AC**: Infrastructure/scaffolding — converts PRPs-prefixed and
  bare-PRD provenance references (classes C2+C5) to prose, a
  different reference class than the 8 resource basenames AC-A2
  tests; no AC-A item covers this class.
- **VALIDATE**:
  ```bash
  if grep -rn '${CLAUDE_PLUGIN_ROOT}/PRPs/' plugins/relay/; then
    echo "FAIL: unrewritten \${CLAUDE_PLUGIN_ROOT}/PRPs/ reference found — must be converted to prose, never repointed"; exit 1
  else
    echo "PASS: zero remaining \${CLAUDE_PLUGIN_ROOT}/PRPs/ references"
  fi
  ```
  Note: this VALIDATE mechanically covers the C2 half in full (the
  `${CLAUDE_PLUGIN_ROOT}/PRPs/` form is unambiguous). The C5 half
  (prose quality of already-bare PRD mentions) is a judgment call the
  Implementer and `code-reviewer` verify by reading the specific
  sites `fix-plan.md` names — not fully mechanizable by a single
  grep, and this VALIDATE does not pretend otherwise.

### Task 6: Delete/inline the out-of-root references (class C6, ~10 refs)

- **ACTION**: Delete or inline every reference that names a path
  outside both `plugins/relay/` and the target project (class C6:
  `plugins/prp-core/…`, `documentation/…` cited from inside an
  agent, `scripts/efficiency.mjs`, a bare `plugin.json` not
  qualified by `.claude-plugin/`). Specifically: (a) remove the
  stale parenthetical `"not yet built as of this phase"` — it
  appears at TWO sites naming `/relay-visual-approve`,
  `relay-implement.md:412` and `relay-implement.md:419` (both
  describe `/relay-visual-approve` as not yet built, but it already
  exists; both occurrences must go, not just the first);
  (b) fix `relay-test-write-review.md:219/223` to name the real risk
  — editing the *installed cache* — instead of a `plugin.json` path
  that does not exist at the repository root (the real path is
  `plugins/relay/.claude-plugin/plugin.json`). Consult `fix-plan.md`
  §F4.4 for the complete site list; this task's VALIDATE below
  covers the two most concretely-cited examples as a representative
  check, not an exhaustive one.
- **MIRROR**: `docs/context/conventions.md:64-73`.
- **AC**: Infrastructure/scaffolding — deletes/inlines out-of-root
  references (class C6: `prp-core`, `documentation/`,
  `scripts/efficiency.mjs`, bare `plugin.json`); none of the 5 AC-A
  items test this reference class.
- **VALIDATE**:
  ```bash
  set -euo pipefail
  if grep -rn 'not yet built as of this phase' plugins/relay/commands/relay-implement.md; then
    echo "FAIL: stale parenthetical still present in relay-implement.md"; exit 1
  fi
  echo "PASS: stale parenthetical removed from relay-implement.md"
  if grep -n '`plugin\.json`' plugins/relay/commands/relay-test-write-review.md | grep -v '.claude-plugin/plugin.json'; then
    echo "FAIL: relay-test-write-review.md still names a plugin.json path outside .claude-plugin/"; exit 1
  fi
  echo "PASS: relay-test-write-review.md's plugin.json reference names the real path or the real risk"
  ```

### Task 7: Strip line-pins and dates from target-doc citations (class C7, ~30 refs)

- **ACTION**: Remove the trailing `:<line>` or `:<line>-<line>` line
  pin, and any embedded `[YYYY-MM-DD]` date pin, from every citation
  of a target-owned governance doc (`docs/decisions.md`,
  `docs/anti-patterns.md`, `docs/context/architecture.md`) across
  `plugins/relay/`, replacing it with a citation by section title.
  These citations resolve to a real file in every target project but
  with unrelated content at the same line/date — the pin lies
  silently rather than failing loud, per the audit's own framing.
- **MIRROR**: `docs/context/conventions.md:64-73` — Task 1's
  cite-by-title rule.
- **AC**: Infrastructure/scaffolding — strips line-pins/dates from
  target-owned governance-doc citations (class C7); no AC-A item
  tests citation-pinning form.
- **VALIDATE**:
  ```bash
  if grep -rnE '`docs/(decisions|anti-patterns|context/architecture)\.md:[0-9]' plugins/relay/; then
    echo "FAIL: a line-pinned citation of a target-owned governance doc remains"; exit 1
  else
    echo "PASS: zero line-pinned citations of docs/decisions.md, docs/anti-patterns.md, or docs/context/architecture.md remain"
  fi
  ```

### Task 8: UPDATE the repo-root doc surfaces

- **ACTION**: Update every reference to the 8 moved resources in
  `docs/KNOWLEDGE_BASE.md` (7 refs), `docs/domain/glossary.md` (4),
  `docs/context/architecture.md` (2), `docs/context/constraints.md`
  + `docs/api-reference.md` + `README.md` (3 combined) to the new
  `plugins/relay/resources/<name>.md` path form (these are
  repo-root, human-facing docs — not `${CLAUDE_PLUGIN_ROOT}`-prefixed,
  since they describe the plugin's own source layout to a
  maintainer, not an installed agent's runtime resolution).
- **MIRROR**: `scripts/validate/checks/path-existence.mjs:61-74`.
- **AC**: Infrastructure/scaffolding — rewrites repo-root doc
  surfaces to the bare `plugins/relay/resources/<name>.md` form
  (deliberately un-prefixed, per this task's own ACTION), which sits
  outside both AC-A2's `plugins/relay/`-tree scope and its required
  `${CLAUDE_PLUGIN_ROOT}/resources/` prefix form.
- **VALIDATE**:
  ```bash
  if grep -rlE 'docs/context/(prd-template|plan-template|design-spec-template|component-map-template|redaction-policy|settings-allowlist|test-output-schema|mock-sentinels)\.md' docs/KNOWLEDGE_BASE.md docs/domain/glossary.md docs/context/architecture.md docs/context/constraints.md docs/api-reference.md README.md; then
    echo "FAIL: a repo-root doc surface still cites the old docs/context/<resource>.md path"; exit 1
  else
    echo "PASS: repo-root doc surfaces updated to the new plugins/relay/resources/ location"
  fi
  ```

### Task 9: UPDATE the documentation/ site surfaces and add the changelog Unreleased entry

- **ACTION**: Update every reference to the 8 moved resources across
  `documentation/README.md`, `documentation/roadmap/status.html`,
  `documentation/reference/{commands,agents,skills,scripts}.html`,
  `documentation/guide/troubleshooting.html`, and
  `documentation/concepts/interactivity-boundary.html` (~16 refs) to
  the new path form. Add a `documentation/changelog.html` entry
  under the existing `Unreleased` block (currently the placeholder
  "Nothing queued yet.") narrating the resource move, per
  `documentation/AGENTS.md` §6/§7 — do NOT rename `Unreleased` to a
  dated version heading here; that release-cut step is Task 14.
- **MIRROR**: `documentation/AGENTS.md:360-366` (entry-template
  shape) and `scripts/validate/checks/path-existence.mjs:61-74`
  (reference target form).
- **AC**: Infrastructure/scaffolding — same reasoning as Task 8 for
  the `documentation/`-site reference rewrites (outside AC-A2's
  `plugins/relay/` scope and prefix form); the changelog `Unreleased`
  entry content added here is also not tested by any AC-A item.
- **VALIDATE**:
  ```bash
  set -euo pipefail
  if grep -rlE 'docs/context/(prd-template|plan-template|design-spec-template|component-map-template|redaction-policy|settings-allowlist|test-output-schema|mock-sentinels)\.md' documentation/README.md documentation/roadmap/status.html documentation/reference/commands.html documentation/reference/agents.html documentation/reference/skills.html documentation/reference/scripts.html documentation/guide/troubleshooting.html documentation/concepts/interactivity-boundary.html; then
    echo "FAIL: a documentation/ site page still cites the old docs/context/<resource>.md path"; exit 1
  fi
  echo "PASS: documentation/ site surfaces updated"
  UNRELEASED_BLOCK=$(sed -n '/id="unreleased"/,/<h2/p' documentation/changelog.html)
  if echo "$UNRELEASED_BLOCK" | grep -q 'Nothing queued yet'; then
    echo "FAIL: Unreleased changelog entry still reads the placeholder"; exit 1
  fi
  echo "PASS: Unreleased entry added"
  ```

### Task 10: Extend scripts/validate/checks/path-existence.mjs

- **ACTION**: Add `'resources/'` to `CLAUDE_PLUGIN_ROOT_ALLOWED_PREFIXES`
  (line 74). Delete the "KNOWN DEFERRED GAP" paragraph (lines 31-35)
  — this is a documentation-only removal (the array never listed
  `docs/`/`PRPs/`, so behavior for those two prefixes is unchanged by
  this deletion alone; the new `plugin-root-resolvable` check in
  Task 11 is what actually closes that blind spot going forward).
- **MIRROR**: `scripts/validate/checks/path-existence.mjs:61-74`
  (extending the array in place).
- **AC**: AC-A3 — one of the two suite-extension actions AC-A3
  tests (the extended `npm run validate` suite): recognizing
  `resources/` as a valid packaged prefix is a precondition for the
  12-check suite reporting all-passing against the migrated tree.
- **VALIDATE**:
  ```bash
  set -euo pipefail
  grep -q "'resources/'" scripts/validate/checks/path-existence.mjs
  if grep -q 'KNOWN DEFERRED GAP' scripts/validate/checks/path-existence.mjs; then
    echo "FAIL: stale KNOWN DEFERRED GAP paragraph still present"; exit 1
  fi
  node -e "import('./scripts/validate/checks/path-existence.mjs').then((m) => { const r = m.runPathExistenceCheck(); if (!r.ok) { console.error('FAIL:', JSON.stringify(r.findings)); process.exit(1); } console.log('PASS: path-existence check reports ok:true against the migrated tree'); });"
  echo "PASS: path-existence.mjs extended correctly"
  ```

### Task 11: CREATE scripts/validate/checks/plugin-root-resolvable.mjs and register it

- **ACTION**: Create a new check module exporting
  `runPluginRootResolvableCheck()` returning `{name: 'plugin-root-resolvable',
  ok, findings: Array<{message, file, line}>}`, mirroring
  `path-existence.mjs`'s exact contract shape. Scope it to the two
  classes `path-existence.mjs` structurally cannot cover (per
  `fix-plan.md` §5b — NOT the `${CLAUDE_PLUGIN_ROOT}/<x>` existence
  class, which `path-existence.mjs` already owns once Task 10 lands):
  (a) any of the 8 resource basenames
  (`prd-template.md`, `plan-template.md`, `design-spec-template.md`,
  `component-map-template.md`, `redaction-policy.md`,
  `settings-allowlist.md`, `test-output-schema.md`,
  `mock-sentinels.md`) appearing anywhere under `plugins/relay/`
  WITHOUT an immediately-preceding `${CLAUDE_PLUGIN_ROOT}/resources/`
  prefix; (b) a literal `plugins/relay/…` substring appearing inside
  `plugins/relay/`'s own files (a regression guard against the H0-class
  defect this whole PRD started from recurring). Anchor both rules on
  backtick-quoted tokens (mirroring `path-existence.mjs`'s
  `resolveBacktickToken`), never raw-line scanning — a raw scan would
  make the check's own array of the 8 basenames a finding against
  itself, and would flag legitimate prose. Register it in
  `scripts/validate/index.mjs`'s `CHECKS` array (import + append),
  taking the count from 11 to 12.
- **MIRROR**: `scripts/validate/checks/path-existence.mjs:95-116`
  (return contract) and `scripts/validate/index.mjs:19-51`
  (registration pattern).
- **AC**: AC-A3 — the other suite-extension action AC-A3 tests
  directly: the new, registered `plugin-root-resolvable` check
  taking the count from 11 to 12.
- **VALIDATE**:
  ```bash
  set -euo pipefail
  grep -q 'runPluginRootResolvableCheck' scripts/validate/index.mjs
  node scripts/validate/index.mjs | grep -q '(12 checks run)'
  FIXTURE="plugins/relay/agents/__tmp_plan1_fixture.md"
  printf -- '---\nname: tmp\n---\nSee `mock-sentinels.md` for details.\n' > "$FIXTURE"
  node -e "
  import('./scripts/validate/checks/plugin-root-resolvable.mjs').then((m) => {
    const r = m.runPluginRootResolvableCheck();
    const hit = r.findings.some((f) => f.file && f.file.includes('__tmp_plan1_fixture'));
    if (!hit) { console.error('FAIL: check did not flag the deliberately bad bare-citation fixture'); process.exit(1); }
    console.log('PASS: check correctly flags a deliberately introduced bare resource citation');
  });
  "
  rm -f "$FIXTURE"
  echo "PASS: plugin-root-resolvable registered (index.mjs reports 12 checks run) and provably able to fail"
  ```

### Task 12: UPDATE the published check-count language

- **ACTION**: Update `CLAUDE.md`'s "11 static consistency checks" to
  "12 static consistency checks", and
  `documentation/guide/validation-suite.html`'s "The eleven static
  checks" heading, its "run all eleven static checks" comment, and
  its summary table (add a `plugin-root-resolvable` row: name +
  one-line description, no unit-test count column on this page) to
  "twelve"/"12". Do NOT touch
  `documentation/reference/validation-checks.html`'s per-check
  catalog or its "Totals: 149 node:test unit tests… npm run validate
  reports 11 checks" line — see `## NOT Building` and `## Notes`.
- **MIRROR**: `scripts/validate/index.mjs:19-51` (the `CHECKS` array
  length is the literal source of the "12" count).
- **AC**: Infrastructure/scaffolding — updates published check-count
  prose (`CLAUDE.md`, `validation-suite.html`); AC-A3 tests the
  suite's own runtime output (12 checks, all passing), not
  documentation prose describing that count.
- **VALIDATE**:
  ```bash
  set -euo pipefail
  grep -q '12 static consistency checks' CLAUDE.md
  grep -qi 'twelve static checks' documentation/guide/validation-suite.html
  if grep -qi 'eleven static checks' documentation/guide/validation-suite.html; then
    echo "FAIL: stale 'eleven static checks' wording remains"; exit 1
  fi
  echo "PASS: check-count language updated to twelve/12 in CLAUDE.md and guide/validation-suite.html"
  ```

### Task 13: Give design-map-writer.md and design-spec-writer.md a template-unreadable failure path

- **ACTION**: In `design-map-writer.md`'s Hard Constraint 1 (lines
  45-51) and `design-spec-writer.md`'s Hard constraint 1 (lines
  64-67), add an explicit failure-path sentence for the template
  `Read` itself failing (missing file, unreadable, or empty) —
  distinct from the existing "missing section = bug" rule, which
  only covers a successfully-read-but-incomplete template. Both
  agents halt with a named code, `FAILED_TEMPLATE_UNREADABLE`,
  rather than improvising the artifact's shape from memory —
  mirroring this same plan-writer agent's own Decision-Gate-source
  halt discipline and the house `FAILED_<REASON>:` naming idiom.
- **MIRROR**: `plugins/relay/agents/design-map-writer.md:45-51` and
  `plugins/relay/agents/design-spec-writer.md:64-67` (the exact text
  each new sentence is appended to).
- **AC**: AC-A4 — this task is exactly what AC-A4 tests (both agents
  name the `FAILED_TEMPLATE_UNREADABLE` halt for an unreadable
  mandatory template).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  grep -q 'FAILED_TEMPLATE_UNREADABLE' plugins/relay/agents/design-map-writer.md
  grep -q 'FAILED_TEMPLATE_UNREADABLE' plugins/relay/agents/design-spec-writer.md
  echo "PASS: both writer agents name the FAILED_TEMPLATE_UNREADABLE halt for an unreadable template"
  ```

### Task 14: Bump plugin.json and cut the changelog release

- **ACTION**: Bump `plugins/relay/.claude-plugin/plugin.json`'s
  `version` field (minor bump, since this ships new commands/agents
  behavior — the new failure paths and the reworded prose are
  user-visible). Rename `documentation/changelog.html`'s `Unreleased`
  heading to a dated version heading (`<h2 id="vX-Y-Z">X.Y.Z —
  YYYY-MM-DD</h2>`) carrying Task 9's entry content, add a fresh
  empty `Unreleased` block above it, and add the plugin.json
  version-bump `<li>` under `Changed`, per
  `documentation/AGENTS.md` §7.5's exact template.
- **MIRROR**: `documentation/AGENTS.md:360-366` and
  `scripts/validate/checks/version-parity.mjs:33-62`.
- **AC**: Infrastructure/scaffolding — release-cut mechanics
  (`plugin.json` version bump + changelog rename); this is the
  necessary precondition for AC-A5's human-operated post-merge cache
  verification, but AC-A5 itself is satisfied by the plan's
  documented manual step (see `## Notes`), not by any automated
  task — so no AC-A item's tested condition is delivered by this
  task directly.
- **VALIDATE**:
  ```bash
  set -euo pipefail
  node scripts/validate/index.mjs | grep -q '\[PASS\] version-parity'
  CURRENT_VERSION=$(grep -m1 '"version"' plugins/relay/.claude-plugin/plugin.json | sed -E 's/.*"version"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/')
  if [ "$CURRENT_VERSION" = "0.25.1" ]; then
    echo "FAIL: plugin.json version was not bumped past the 0.25.1 baseline — no release was cut"; exit 1
  fi
  VERSION_ID="v${CURRENT_VERSION//./-}"
  if ! grep -q "<h2 id=\"${VERSION_ID}\">" documentation/changelog.html; then
    echo "FAIL: no <h2 id=\"${VERSION_ID}\"> release heading found in documentation/changelog.html for the bumped plugin.json version ${CURRENT_VERSION}"; exit 1
  fi
  RELEASED_BLOCK=$(sed -n "/id=\"${VERSION_ID}\"/,/<h2/p" documentation/changelog.html)
  if echo "$RELEASED_BLOCK" | grep -q 'Nothing queued yet'; then
    echo "FAIL: the newly cut release heading (${VERSION_ID}) still carries the empty-Unreleased placeholder instead of Task 9's entry content"; exit 1
  fi
  echo "PASS: version-parity confirms the plugin.json/changelog.html lock-step bump; plugin.json was bumped past the 0.25.1 baseline; a new dated release heading (${VERSION_ID}) exists in changelog.html carrying real entry content rather than the placeholder"
  ```

## Validation Commands

**Level 1 — STATIC_ANALYSIS**
```bash
npm run validate
```
Exits non-zero if any of the (now 12) registered checks fails —
real exit-code semantics via `index.mjs`'s own `process.exitCode = 1`
on any failure; no wrapping needed.

**Level 2 — CONTENT_INVARIANTS**
```bash
set -euo pipefail
if grep -rE 'docs/context/(prd-template|plan-template|design-spec-template|component-map-template|redaction-policy|settings-allowlist|test-output-schema|mock-sentinels)\.md' plugins/relay/; then
  echo "FAIL: an old-form reference to a moved resource remains anywhere under plugins/relay/"; exit 1
fi
for f in prd-template plan-template design-spec-template component-map-template redaction-policy settings-allowlist test-output-schema mock-sentinels; do
  test -f "plugins/relay/resources/${f}.md"
  test ! -f "docs/context/${f}.md"
done
echo "PASS: all 8 resources moved, zero old-form references remain under plugins/relay/"
```

**Level 3 — INTEGRATION / DRY-RUN END-TO-END**
```bash
set -euo pipefail
OUTPUT="$(node scripts/validate/index.mjs)"
echo "$OUTPUT" | grep -q '(12 checks run)'
echo "$OUTPUT" | grep -q '^12 passed, 0 failed'
echo "PASS: full validate suite reports 12/12 green"
```

Levels 4-6 (browser/database/manual) are not part of the fixed agent
contract and are not included — the one genuinely manual step this
phase has (the installed-cache listing) is documented in `## Notes`
as a human-operated step, never dressed up as an automated Level.

## Acceptance Criteria

- **AC-A1 (PRD AC-17):** Given the 8 plugin-owned resources, when
  Task 2 completes, then they exist at `plugins/relay/resources/`
  and no file remains at their old `docs/context/` location (zero
  stubs).
- **AC-A2 (PRD AC-17):** Given `plugins/relay/`'s full tree, when
  searched for any of the 8 resource basenames, then every occurrence
  carries the `${CLAUDE_PLUGIN_ROOT}/resources/` prefix — zero bare
  or `${CLAUDE_PLUGIN_ROOT}/docs/context/`-prefixed forms remain.
- **AC-A3 (PRD AC-17):** Given the extended `npm run validate` suite,
  when it runs against the post-migration tree, then it reports 12
  checks, all passing, including the newly-registered
  `plugin-root-resolvable` check.
- **AC-A4 (PRD AC-17):** Given `design-map-writer.md` and
  `design-spec-writer.md`, when their mandatory template `Read`
  fails, then each names an explicit `FAILED_TEMPLATE_UNREADABLE`
  halt rather than silently improvising the artifact's shape from
  memory.
- **AC-A5 (PRD AC-17):** Given the packaging outcome itself (all 8
  files present under the installed plugin cache's `resources/`
  directory), then it is verified by a documented, explicitly
  human-operated post-merge step — never asserted by an automated
  Validation Command in this plan, since no in-repo command can
  observe the installed cache.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| The 8 existing test files' hardcoded path constants (55 total) go temporarily red between this plan's Implementer tasks and the test-writer's `EXISTING_TEST_UPDATED` pass | H | M | Explicitly excluded from Step-by-Step Tasks per R-X strict (see `## Notes`); this plan's own Level 1-3 commands never invoke `node --test` against those 8 files, only `npm run validate` (which does not scan `.test.mjs` files) plus a scoped `node -e` smoke-test of the new check module. The full corpus is confirmed green later by `/relay-write-test` → `/relay-test-write-review` → `/relay-test`, not by this plan. |
| The bulk reference rewrite (~104-134 lines across ~25 files) is mechanically wide; a missed reference silently reintroduces a dangling path | M | M | Tasks 3, 4, 6, 7 each end with a `grep`-based VALIDATE proving zero remaining old-form references in their class; Task 11's new `plugin-root-resolvable` check adds a permanent, unscoped regression gate that would catch anything missed on the very next commit even if this phase's own manual sweep is imperfect. |
| Packaging correctness (the phase's actual point) cannot be verified from inside the repository | H | H | Named explicitly, not hidden: the cache-listing check is a documented post-merge, human-operated step (`## Notes`), never dressed up as an automated Validation Command. |
| The PRD's Phase 1 Scope names marking `fix-plan.md` "superseded", which conflicts with the orchestrator's explicit instruction not to rewrite historical `PRPs/reports/` artifacts | L | L | Resolved in favor of the more specific, dispatch-time constraint: no task edits `fix-plan.md`. The APPROVED PRD's own text already declares the supersession; documented as a conscious scope decision in `## Notes` rather than a silent gap. |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of
`tdd` in `docs/context/methodology.md`: **false**. Test-after
ordering — when a test framework is declared, the test pair
(test-writer/test-reviewer) authors and maintains the suite from the
Acceptance Criteria above, after the Implementer + Code Review; with
no framework declared, no tests are authored. This repo declares
`test_frameworks: ["node:test"]`, so the pair is active in test-after
mode.

**Row-1 selection independently confirmed.** This plan's own Phase 1
parse of the Implementation Phases table agrees with the
orchestrator's pre-check: row 1 ("Resource packaging") is `pending`
with `Depends: -` — the lowest-numbered actionable row. Rows 2-6 all
depend on row 1 (directly, or transitively via row 4's `Depends:
1, 3`) and are therefore not yet actionable.

**Why no task touches a `*.test.mjs` file (R-X strict).** The source
PRD's own Technical Approach section states this explicitly for
planning purposes: "every test-file edit must be routed through the
test pair's lifecycle ledger as an `EXISTING_TEST_UPDATED`, never
authored by the Implementer — including the one-line regex changes."
The 55 hardcoded path constants across the 8 existing test files
(`figma-visual-first-track-phase{1..5}.test.mjs`,
`figma-track-phase{3,4,5}.test.mjs`) and the new check's own
`plugin-root-resolvable.test.mjs` are both test-file work. Neither
`npm run validate` (Level 1) nor the new `plugin-root-resolvable`
check itself scans `.test.mjs` files (the former's `SCAN_ROOTS` are
`['plugins/relay', 'docs']` scoped to `.md`; the latter walks only
`plugins/relay/`, and the 8 test files live at
`scripts/validate/checks/`, outside both) — so this plan's own
Validation Commands legitimately stay green immediately after the
Implementer's own tasks, without touching a test file. The PRD's
"`npm run validate` plus the full node:test corpus is the gate"
framing is satisfied across the whole phase (Implementer → test-writer
→ test-reviewer → `/relay-test`), not by this plan's own Level 1-3
gate in isolation.

**Why `documentation/reference/validation-checks.html` is
untouched.** `docs/context/constraints.md` (lines 96-124) records the
established precedent: when `gating-structure` and `feedback-chain`
shipped, their catalog sections and the page's "Totals" line were
deliberately NOT back-filled until each check's own `node:test` unit
tests existed test-after — "Write the tests first, then both
reference sections." Since `plugin-root-resolvable.test.mjs` is
explicitly out of this plan's scope (R-X strict, above), the same
deferral applies here.

**Why `PRPs/reports/plugin-root-audit/fix-plan.md` is not edited to
add a "superseded" marker, despite the PRD's Phase 1 Scope naming
that step.** This plan's dispatch context states explicitly: "Do NOT
rewrite historical artifacts under `PRPs/plans/completed/`,
`PRPs/prds/`, `PRPs/reports/`, or `docs/decisions.md` — they are
audit trail," and `fix-plan.md` lives under `PRPs/reports/`. This
plan resolves the tension in favor of that explicit, more specific
constraint: no Step-by-Step Task edits `fix-plan.md`. The supersession
itself is already recorded where it structurally belongs — the
APPROVED PRD's own "What We're NOT Building" section states verbatim
that "the fix-plan document is retained as historical rationale and
must be marked superseded so the two cannot silently diverge," and
its Decisions Log records the same choice. A human maintainer wanting
an in-file banner on `fix-plan.md` itself (mirroring the file's own
existing additive "Nota de sessão" convention) can add one by hand;
this plan does not.

**Why the packaging outcome cannot be a Validation Command.** The
PRD's own Architecture Notes state it plainly: "Phase 1's only real
verification is outside the repo... the cache is the source of
truth." No command available to the Implementer can list
`~/.claude/plugins/cache/relay-marketplace/relay/<version>/` for a
version that has not yet been published. This plan's Success signal
therefore separates the in-repo, automatable half (Levels 1-3 above)
from the post-merge, human-operated half (run `claude plugin
marketplace update && claude plugin update relay`, then `ls
~/.claude/plugins/cache/relay-marketplace/relay/<new-version>/resources/`
and confirm all 8 files are listed) — the latter is a checklist item
for whoever cuts the release, not a claim this plan's own commands
verify.

**`phase_type: refactor` — reasoning.** The phase's dominant
character is a structural move-and-rewrite (8 files relocated,
~104-134 references rewritten) rather than new product behavior; the
companion `plugin-root-resolvable.mjs` check is a standard
regression-guard addition to a refactor, not a feature in its own
right. It does not cleanly match `scaffold` (not a bootstrap/init
phase), `docs` (two real `.mjs` application/tooling files are
touched, not only documentation), or `foundation` (creates no new
domain entity/repository/schema seam a later phase's Acceptance
Criteria depend on being tested against). Given `tdd: false` in this
repository, the `foundation` self-skip this classification exists to
gate does not trigger regardless of this call.

**External corroboration (research-web).** No official Claude Code
documentation describes an `include`/`exclude` manifest field; a
third-party bug report (`pbakaus/impeccable#107`) independently
confirms full-directory-copy install behavior with no
selective-packaging mechanism, corroborating the audit's own
inference (`relay-plugin-root-audit.md` §9.1, "Resolvido: não
existe"). No change to this plan's approach follows from this
research; it is confirmatory only.

**`docs/KNOWLEDGE_BASE.md` — pre-existing gap, not this phase's to
fix.** `plan-template.md` is absent from that file's Project Context
list entirely (the other 7 templates are present, just at the old
path). Task 8 corrects the 7 paths that exist; adding the missing
8th entry is a content-completeness gap unrelated to path-correctness
and is intentionally left alone here.

---

*Generated: 2026-08-03*
*Approved: 2026-08-03*
*Status: APPROVED*
