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

**What it is:** An agent edits, skips, or removes failing tests in order to satisfy the "all tests pass" exit condition of the Test Runner loop. [INFERRED - VALIDATE]
**Why it's forbidden:** Optimizes for "verde" instead of "correto". The loop is supposed to fix the implementation, not the contract. The post-green reviewer (B5) exists precisely to catch this.
**What to do instead:** Fix the implementation, or — if the failure exposes a real requirement gap — abort and surface the conflict to the human.
**Areas affected:** Test Runner (B1–B5), auto-correction loop (B4)

---

## Writing TDD tests that mirror the imagined implementation

**What it is:** In TDD mode, the TDD Writer (B7) produces tests that encode specific implementation choices (internal method names, private data shapes, mocked collaborators that presuppose a design) instead of requirements from the PRD. [INFERRED - VALIDATE]
**Why it's forbidden:** Tests and implementation then "nascem acoplados" and exert no design pressure on the code — the core failure mode of AI-driven TDD called out by the planning document.
**What to do instead:** TDD Writer derives tests from PRD requirements and observable behavior. TDD Reviewer (B8) rejects suites that leak implementation details, rely on excessive mocks, or contain trivial asserts.
**Areas affected:** TDD track (B7, B8)

---

## Emitting secret values in run reports or logs

**What it is:** Test Runner captures stdout/stderr that contains API keys, tokens, or other credentials and writes them verbatim into the execution report or PR body. [INFERRED - VALIDATE]
**Why it's forbidden:** Reports can end up in public PRs; any leak is an incident. Component A4 (secrets) mandates redaction; B6 (report) must apply the filter.
**What to do instead:** Indicate only presence/absence of credentials. Redact values known to be secret at the source (env var allowlist).
**Areas affected:** Test Runner infra (A4), report generator (B6)

---

## Activating the TDD track by heuristic

**What it is:** Inferring that a project "does TDD" from the existence of a test folder, a high test count, or a CI job, and enabling B7/B8 automatically. [INFERRED - VALIDATE]
**Why it's forbidden:** TDD is a methodology, not a side effect of having tests. Activating it silently surprises teams that test a lot without practicing TDD. See `docs/decisions.md` entry on opt-in activation.
**What to do instead:** Read `docs/context/methodology.md` and check exactly one key: `tdd: true | false`. No declaration file, `tdd: false`, or missing frontmatter → skip B7/B8 silently. The context-builder skill MUST create this file in every `*init` run with `tdd: false` as the default.
**Areas affected:** orchestrator activation, context-builder skill, TDD agents (B7, B8)

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

<!-- Template for future entries:

## [pattern name]

**What it is:** Brief description.
**Why it's forbidden:** The reason this was explicitly prohibited.
**What to do instead:** The approved alternative.
**Areas affected:** [list domain areas]

-->
