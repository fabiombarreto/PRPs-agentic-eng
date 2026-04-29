---
registries:
  - path: plugins/relay/commands/
    rule: every new agent file in plugins/relay/agents/ must be referenced by at least one command file in plugins/relay/commands/
  - path: documentation/reference/agents.html
    rule: every new agent file must have a section in this page (or be listed in the Planned table)
  - path: documentation/changelog.html
    rule: every change to plugins/relay/agents/ must add a changelog entry under the current Unreleased block
  - path: documentation/AGENTS.md
    rule: contract for documentation/ changes — the three-file rule mandates NAV / search-index / changelog updates whenever pages are added, renamed, or removed
---

# Code Review Registries

Declarative list of paths the `code-reviewer` agent's
`R-COH-REGISTRY-MISSING` deterministic check considers when verifying
that new files in a diff are properly registered in expected
indexes / NAV / cross-references.

## Purpose

When a diff creates new files (CREATE action in the plan's
`## Files to Change` table) under directories listed in the
`registries:` frontmatter above, the `R-COH-REGISTRY-MISSING` check
greps each registry's expected index files (NAV, search-index,
changelog, etc.) for the new file's path or basename. If the new
file is unregistered in any of the expected indexes, the check
fails with a row in `code-review.jsonl` naming the new file path
and the missing registry path(s).

## Per-project regeneration

Target projects that adopt the `relay` plugin receive this file via
`context-builder` `*update`, which regenerates the `registries:`
list when the project's documentation structure changes. Manual
edits to either the frontmatter or this prose body are preserved
across regeneration when possible (the context-builder uses a
stable header check). Projects that do not run `context-builder`
or whose documentation has no NAV/index/changelog convention can
delete the file or leave the frontmatter as `registries: []`.

## Empty-default behavior

When `registries: []` (or this file is absent from
`<target_root>/docs/context/`), the `R-COH-REGISTRY-MISSING` check
degrades silently — emits a single `passed: true` row with reason
"no registries declared; check skipped". This matches the source
PRD's principle of silent degradation for projects without the
relevant context.

## Frontmatter shape

The `registries:` list contains one entry per registered scope.
Each entry has two fields:

- `path`: the registry path (relative to `<target_root>`). Either
  a directory (whose contents are indexed by another file) or an
  index file itself.
- `rule`: prose describing what the registry enforces. The
  `R-COH-REGISTRY-MISSING` check uses this string only for the
  failure `reason` field; it does NOT parse or interpret the rule
  text.

The default-relay 4-path list above is the canonical set for the
`relay` plugin repository. Adopters typically extend this list with
project-specific NAV files, sidebar configurations, search indexes,
and any cross-reference index that should be updated when new files
are added.

## Cross-references

- `plugins/relay/agents/code-reviewer.md` — the `R-COH-REGISTRY-MISSING`
  deterministic check definition.
- `PRPs/prds/reviewer-coherence-layer.prd.md` — Q4 Decision Gate
  evidence (registry allowlist scope; M=10 import hop; 5-path cap)
  and D6 in the Decisions Log (registry allowlist location).
- `documentation/AGENTS.md` §6 — the canonical three-file
  registration rule for the documentation site itself, which is one
  of the registries listed above.
