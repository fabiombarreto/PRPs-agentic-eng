# Anti-Patterns

Padrões proibidos, features desabilitadas e restrições intencionais.
A IA NÃO deve implementar nada listado aqui, mesmo que pareça correto.
Atualizado pelo Docs Updater após cada aprovação de implementação.

**Note:** most items below are derived from `docs/planning/planejamento_fase_2.docx`
because the relay codebase is still in its earliest stage (only the
`context-builder` skill exists). They document rules the plugin MUST enforce
once the corresponding agents are implemented. Marked `[INFERRED - VALIDATE]`
because the enforcement code does not yet exist.

---

## Weakening or deleting tests to make the auto-correction loop turn green

**What it is:** An agent edits, skips, or removes a test that still encodes a live requirement in order to satisfy the "all tests pass" exit condition of the Test Runner loop. [INFERRED - VALIDATE]
**Why it's forbidden:** Optimizes for "verde" instead of "correto". The loop is supposed to fix the implementation, not the contract. The post-green reviewer (B5) exists precisely to catch this.
**What to do instead:** Fix the implementation, or — if the failure exposes a real requirement gap — abort and surface the conflict to the human.
**Carve-out (NOT weakening):** legitimate retirement of an **obsolete** test (its behavior-under-test is gone from the in-scope ACs) or a **redundant** test (a proven duplicate), performed by the approved test pair, recorded in the suite manifest's lifecycle ledger, and validated by `test-reviewer`'s `R-LIFECYCLE-LEGITIMATE`. B5 accepts a removal/skip only when it matches an APPROVED ledger entry; every unmatched removal — and every removal when no manifest exists — still blocks. The Implementer and the auto-correction loop still author ZERO test-file changes (R-X strict); only the approved test pair's ledger authorizes a removal. See the 2026-07-10 decision.
**Areas affected:** Test Runner (B1–B5), auto-correction loop (B4), test pair (test-writer/test-reviewer)

---

## Writing tests that mirror the implementation instead of the requirements

**What it is:** The `test-writer` produces tests that encode specific implementation choices (internal method names, private data shapes, mocked collaborators that presuppose a design) instead of requirements from the PRD. In test-first this mirrors an *imagined* implementation; in test-after the risk sharpens — the tests can mirror the *actual* code just written, exerting no independent pressure. [INFERRED - VALIDATE]
**Why it's forbidden:** Tests and implementation then "nascem acoplados" and exert no design pressure on the code — the core failure mode of AI-driven testing.
**What to do instead:** `test-writer` derives tests from PRD requirements and observable behavior. `test-reviewer` rejects suites that leak implementation details (`R-IMPL-LEAK`), rely on excessive mocks, or contain trivial asserts — in both modes.
**Areas affected:** test pair (test-writer, test-reviewer)

---

## Emitting secret values in run reports or logs

**What it is:** Test Runner captures stdout/stderr that contains API keys, tokens, or other credentials and writes them verbatim into the execution report or PR body. [INFERRED - VALIDATE]
**Why it's forbidden:** Reports can end up in public PRs; any leak is an incident. Component A4 (secrets) mandates redaction; B6 (report) must apply the filter.
**What to do instead:** Indicate only presence/absence of credentials. Redact values known to be secret at the source (env var allowlist).
**Areas affected:** Test Runner infra (A4), report generator (B6)

---

## Activating the test pair by heuristic

**What it is:** Inferring that a project wants relay-authored tests from the existence of a test folder, a high test count, or a CI job, and enabling the test pair automatically — or inferring the `tdd:` value the same way. [INFERRED - VALIDATE]
**Why it's forbidden:** Activation is a methodology declaration, not a side effect of having tests; silent activation surprises teams. And `tdd:` selects *ordering* (test-first vs test-after), which must not be guessed.
**What to do instead:** Read `docs/context/methodology.md`. The single activation gate is a declared framework: non-empty `test_frameworks` → the pair runs (in BOTH modes); `test_frameworks: []` or missing frontmatter → skip the pair silently. The `tdd:` value only selects ordering, never whether the pair runs — do NOT infer it from test folders/CI. The context-builder skill MUST create this file in every `*init` run with `tdd: false` and `test_frameworks: []` as the default (the pair is opt-in by declaring a framework).
**Areas affected:** orchestrator activation, context-builder skill, test pair (test-writer/test-reviewer)

---

## Injecting plugin defaults into the target project's `decisions.md`

**What it is:** The context-builder skill (or any future agent) writes plugin-level defaults — `max_test_retries: 3`, `tdd: false` default, PRP root path, etc. — into the target project's `docs/decisions.md` as if they were decisions the project made.
**Why it's forbidden:** Conflates two different purposes. `decisions.md` records **project decisions** that the AI must not re-evaluate; plugin defaults are **relay's own contracts** and live in relay's repo. Copying them into every target project creates drift — when relay updates a default (e.g., after telemetry), target projects keep the stale value, and `*update` mode correctly refuses to overwrite human-validated content.
**What to do instead:** Plugin defaults stay in the plugin (hardcoded in agent prompts or in a future plugin config file). Target projects record in their `decisions.md` ONLY when they explicitly override a default, with the rationale. Visibility of inherited defaults is a separate concern — deferred to the Phase 2 config design (`.relay.yaml` or equivalent).
**Areas affected:** context-builder skill, future Docs Updater, future plugin-config generators

---

## Writing pipeline artifacts under `.claude/`

**What it is:** An agent writes a PRD, plan, Test Runner report, TDD suite, or any other pipeline artifact somewhere under the `.claude/` directory (e.g., `.claude/PRPs/prds/foo.prd.md`). [INFERRED - VALIDATE]
**Why it's forbidden:** Claude Code enforces hardcoded permission prompts on writes to `.claude/`. Each prompt interrupts the autonomous portion of the pipeline. The permission guards are intentional and have no bypass. See `docs/decisions.md`.
**What to do instead:** Write to `PRPs/` at the target repository root: `PRPs/prds/`, `PRPs/plans/`, `PRPs/reports/<feature>/`. Every agent that produces an artifact MUST use this root.
**Scope / exception:** This rule applies to **pipeline artifacts** — things produced during an autonomous run. It does NOT apply to `.claude/settings.json`, which is **setup configuration** written once by the context-builder during `*init` (interactively, with the user approving the write once at setup time). Context-builder writes to `.claude/` are allowed and expected; pipeline (autonomous) writes to `.claude/` remain forbidden.
**Areas affected:** PRD Writer, Plan Writer, TDD Writer, Test Runner report (B6), observability (C4), Docs Updater, orchestrator

---

## Treating `plugins/prp-core/` as active relay code

**What it is:** Extending, importing from, or documenting `plugins/prp-core/` as if it were part of the relay plugin surface (e.g., generating domain areas from it, referencing its `/prp-*` commands as relay features).
**Why it's forbidden:** `prp-core` is the upstream Wirasm plugin kept on disk as a format reference. Mixing it into relay couples relay to upstream evolution and blurs ownership. See `docs/decisions.md`.
**What to do instead:** Read prp-core files when you need to see how a Claude Code skill/command/agent/hook is structured. Never cite or import them as part of relay.
**Areas affected:** plugin scope, documentation scope

---

## Relying on interactive permission prompts in the autonomous loop

**What it is:** Shipping pipeline steps that require per-command confirmation in Claude Code, breaking the "single prompt → PR" promise. [INFERRED - VALIDATE]
**Why it's forbidden:** Component C1 of the Phase 2 plan mandates `.claude/settings.json` with an explicit allowlist; without it, the auto-correction loop halts on its first bash command.
**What to do instead:** Declare all required commands in the plugin's versioned settings allowlist. Never rely on the human to approve individual tools during an autonomous run.
**Areas affected:** permissions (C1), orchestrator autonomy

---

## Flipping `figma_track` (or any future opt-in gating key) by heuristic

**What it is:** Inferring that a project wants the Figma implementation track active from Figma-shaped file names, `.fig` references, pasted Figma URLs, or design-tool mentions in commit history or docs, and flipping `figma_track: true` (or backfilling any value other than the deterministic default) automatically instead of via explicit human/command action.
**Why it's forbidden:** `figma_track` follows the same non-heuristic contract already established for `docs_sync` and `tdd`: default-`false` emission on `*init`, preserve-on-`*update` of an already-set value, and backfill-only-when-the-key-is-entirely-absent. A run whose behavior depends on Figma involvement being detected rather than declared reintroduces exactly the "forgot to check" vs. "doesn't apply" ambiguity the methodology-declaration model exists to prevent (`docs/decisions.md` [2026-04-19] Methodology declaration).
**What to do instead:** Read `figma_track` from `docs/context/methodology.md` frontmatter only. `*init` always emits `figma_track: false`; `*update` preserves an existing value untouched and backfills `false` only when the key is entirely absent. The value flips to `true` only via a human edit to the file or the explicit confirmation step of the future `/relay-design-map` command (Phase 3 of the Figma implementation track) — never by heuristic detection. Enforced deterministically by the `gating-structure` check in `npm run validate` (`scripts/validate/checks/gating-structure.mjs`), extensible to future opt-in keys by appending to its `SITES` registry.
**Areas affected:** context-builder skill, `npm run validate` (gating-structure check), the future Figma implementation track (Phases 2–7)

---

## Querying the Figma MCP from a dispatched writer/reviewer agent

**What it is:** A Task-dispatched agent (e.g. `design-map-writer`, `design-map-reviewer`, or any future Figma Implementation Track writer/reviewer) calls a Figma MCP tool (`search_design_system`, `get_metadata`, `get_code_connect_map`, etc.) directly, instead of reading only the Figma evidence already persisted to disk by the interactive command that dispatched it.
**Why it's forbidden:** Confirmed technically reachable (`docs/decisions.md` 2026-07-22 MCP-access spike), but the baseline architecture deliberately keeps all Figma MCP calls in the interactive command's own session (`/relay-design-map`, and the future `/relay-design-spec`) so the entire autonomous stretch of the pipeline stays structurally independent of Figma/MCP availability, and Figma context-budget management stays centralized in one place.
**What to do instead:** Dispatched agents read Figma facts exclusively from the persisted evidence bundle the calling command writes before dispatch (e.g. `PRPs/reports/design-map/evidence/` for `/relay-design-map`). `design-map-writer` (`Read, Write, Edit, Glob, Grep`) and `design-map-reviewer` (`Read, Edit, Write`) carry no Figma-MCP tool or `Bash`/`WebFetch` in their allowlists — enforced structurally, not just by instruction.
**Areas affected:** `design-map-writer` agent, `design-map-reviewer` agent, `/relay-design-map` command, `design-spec-reviewer` agent (Phase 4, shipped 2026-07-23 — MCP-free by its own `Read, Edit, Write` tools allowlist regardless of `invocation_context`). **Not** `design-spec-writer`: Phase 4 shipped it inline-adopted by `/relay-design-spec` (never `Task`-dispatched), so it queries the Figma MCP directly in its own session by design — this anti-pattern's premise (a *Task-dispatched* agent bypassing persisted evidence) does not apply to an inline-adopted role. See `docs/decisions.md` [2026-07-23] Design Spec pair extends the interactivity boundary. Also `research-design` agent (Phase 5, shipped 2026-07-23 — the conditional third `plan-writer` GROUNDING subagent; MCP-free by its own `Read, Glob, Grep` tools allowlist, with no Figma-MCP-specific entry needed since it has no MCP tool access mechanism at all; verifies `CM-<n>` mappings exclusively against `docs/design/component-map.md` and the design-system clone already on disk, self-citing this exact anti-pattern by name in its own protocol). Also `visual-verifier` agent (Phase 6, shipped 2026-07-23 — dispatched non-interactively by `/relay-implement`'s Phase A.3.4 immediately after code-review `APPROVED`; MCP-free by its own `Read, Write, Glob, Grep, Bash, BashOutput, KillBash` tools allowlist, with no Figma-MCP-specific entry needed since it has no MCP tool access mechanism at all; reads only the already-persisted Design Spec and reference PNGs already on disk, self-citing this exact anti-pattern by name in its own protocol).

---

<!-- Template for future entries:

## [pattern name]

**What it is:** Brief description.
**Why it's forbidden:** The reason this was explicitly prohibited.
**What to do instead:** The approved alternative.
**Areas affected:** [list domain areas]

-->
