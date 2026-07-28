# Knowledge Base (Tier 2 — TOC)

Index of detailed documentation for the `relay` plugin.

User-facing intro: see `README.md` at the repository root.

---

## Architecture & Development

→ docs/architecture.md — developer-facing overview of how the plugin loads and evolves
→ docs/development.md — how to add a skill/command/agent and smoke-test locally
→ docs/api-reference.md — current and planned skills/commands/agents
→ docs/troubleshooting.md — common setup issues (MCP Context7, prp-core confusion)

## AI Governance

→ docs/decision-gate.md — mandatory control mechanism activated before planning, coding, or review
→ docs/decisions.md — stable technical decisions that must not be re-evaluated
→ docs/anti-patterns.md — forbidden patterns and intentional restrictions

## Project Context

→ docs/context/architecture.md — plugin layout, phases, relationship to upstream prp-core, Pillar 2/3 docs-sync split (implement-time primary, approve-time safety net)
→ docs/context/conventions.md — frontmatter, file naming, hook script conventions
→ docs/context/integrations.md — Claude Code runtime, Context7 MCP (planned), Figma MCP (planned), Docker (planned)
→ docs/context/constraints.md — early-stage status, graceful-degradation mandate
→ docs/context/methodology.md — single source of truth for methodology declarations (TDD opt-in)
→ docs/context/prd-template.md — canonical shape of every PRD the pipeline produces (fork of prp-core with relay adaptations)
→ docs/context/settings-allowlist.md — catalog of allow/deny patterns the context-builder emits into `.claude/settings.json` for each target project
→ docs/context/redaction-policy.md — catalog of patterns the Test Runner applies when writing reports, so secret values never reach a committed file
→ docs/context/test-output-schema.md — canonical JSON schema every test framework output is normalized into (consumed by B3/B4/B5/B6 of the Test Runner)
→ docs/context/component-map-template.md — canonical shape of `docs/design/component-map.md`, the versioned Figma-to-code component map that `design-map-writer`/`design-map-reviewer` reference as authoritative (Figma Implementation Track Phase 3)
→ docs/context/design-spec-template.md — canonical shape of `PRPs/designs/<feature>/design-spec.md`, the per-feature, human-approved Design Spec that `design-spec-writer`/`design-spec-reviewer` reference as authoritative (Figma Implementation Track Phase 4)
→ docs/context/mock-sentinels.md — the [RELAY-MOCK-DATA]/[RELAY-MOCK-BEHAVIOR] inline sentinel convention for phase_scope: visual plans (Figma Visual-First Track)

## Design System (Figma Track)

→ docs/design/dogfood-runbook.md — checklist a human operator runs against a real downstream project to exercise the Figma Implementation Track's Phase 7 end-to-end success signal
→ docs/design/visual-first-dogfood-runbook.md — checklist a human operator runs against a real downstream project to exercise the Figma Visual-First Track's Phase 7 end-to-end success signal

## Domain

→ docs/domain/glossary.md — agent, orchestrator, PRD, PRP, TDD, flakiness, worktree, and other recurring terms
→ docs/domain/flows.md — init / implementation / approval pipelines in non-technical language
→ docs/domain/areas/ — stub explaining why no traditional business areas exist (pipeline-based project)

## Planning Sources

→ docs/planning/dev_process_improvement_plan.html — three-pillar vision (init, implementation, approval) and five-phase rollout
→ docs/planning/planejamento_fase_2.docx — detailed Phase 2 design: Test Runner, auto-correction loop, optional TDD track
