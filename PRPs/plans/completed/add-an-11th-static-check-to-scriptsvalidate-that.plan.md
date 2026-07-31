# Feature: Enforce the review_started_at timestamp contract (description mode)

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting artifact creation (a new registered check under `scripts/validate/`); modification of a contract-bound shared surface (`documentation/`); amendment of a governance record (`docs/context/constraints.md`); a change that alters what `npm run validate` gates on every commit
- Decisions found:
  - [2026-07-12] Validation suite: `npm run validate` is the deterministic, pre-commit-blocking static layer, scoped to `plugins/relay/` and never `prp-core/`; the relay repo declares `test_frameworks: ["node:test"]` with `tdd: false`, and the checker unit tests come from the test pair — the Implementer authors ZERO test files (R-X strict). This forbids planning `timestamp-contract.test.mjs` as an Implementer task.
  - [2026-05-06] / [2026-07-10] Test pair universalized: activation is on a declared framework; `tdd:` selects ordering only.
  - [2026-07-31] The `review_started_at` contract itself (`docs/decisions.md`, shipped v0.25.0 / `e0a0c17`): each dispatching command captures the instant with `date -u +%Y-%m-%dT%H:%M:%SZ` and passes it through; the four clockless reviewers write it verbatim and fall back to `"timestamp_degraded": true`, while the three Bash-capable ones self-serve `date -u` and never set the flag. This plan does not re-decide any of that — it makes the already-decided contract mechanically enforced.
  - [2026-04-30] Plugin manifest version bumps on a minor/major release cut, or a patch shipping a plugin asset (`documentation/AGENTS.md` §7.5). Relevant as a NON-trigger: every file this plan touches lives outside `plugins/relay/`, so `plugin.json` stays at `0.25.0` and the entry lands under `Unreleased`.
- Applicable anti-patterns:
  - Weakening or deleting tests to make a run turn green (`docs/anti-patterns.md`) — every assertion class here must be pinned by a fixture that genuinely fails when the guarded property is broken.
  - Writing tests that mirror the implementation instead of the requirements — fixtures must exercise the documented contract, not restate the module's control flow.
  - Treating `plugins/prp-core/` as active relay code — the new check must scope its reads to `plugins/relay/`, matching every sibling check.
  - Writing pipeline artifacts under `.claude/` — this plan writes only under `PRPs/plans/`, `scripts/`, `docs/`, `documentation/`, and `CLAUDE.md`.
- Applicable architectural rules:
  - `documentation/AGENTS.md` §2 invariants: no build step, no new CSS or JS file, no inline `<style>`/`style=""`, no emojis, relative paths only.
  - `documentation/AGENTS.md` §9 (modify an existing page) and §7.4 (every `documentation/` change carries a changelog entry).
  - The check-module contract established by every sibling: a pure exported function over already-read inputs, plus a thin wrapper owning all I/O, returning `{ name, ok, findings: [{ message, file, line }] }`.
- Result: PROCEED
```

## Source

Add an 11th static check to scripts/validate/ that enforces the review_started_at timestamp contract shipped in v0.25.0 (commit e0a0c17), closing the enforcement gap that release left open. Repo root for ALL reads and writes is the absolute path C:\repos\PRPs-agentic-eng (NOT the session worktree under .claude/worktrees/) — resolve every relative path against that root. Problem: v0.25.0 fixed 45% degenerate T00:00:00Z reviewer timestamps by adding a review_started_at input, but that fix is prose spread across 15 files (7 reviewer agents + 8 dispatching commands) with ZERO mechanical enforcement — the exact shape of the prior_feedback gap that feedback-chain.mjs was created to close, and the exact way this contract will silently re-sever. Mirror feedback-chain.mjs and gating-structure.mjs: a pure exported check function taking already-read file contents plus a thin runner wrapper doing the I/O, a registry-driven design extensible by appending an entry rather than writing a new module, registered in scripts/validate/index.mjs's CHECKS array. The registry is the 7 jsonl-appending reviewers: code-reviewer, docs-reviewer, test-reviewer, plan-reviewer, prd-reviewer, design-map-reviewer, design-spec-reviewer. Deliberately EXCLUDED and worth a comment saying why: post-green-reviewer (Bash-capable but appends no jsonl and has no Write tool) and code-reviewer-semantic (returns structured JSON to its code-reviewer parent, no Write tool). Assertions the check must make. (1) Each registered reviewer declares a review_started_at input. (2) Each carries a "### Timestamp discipline (mandatory)" section. (3) That section names the degenerate T00:00:00 value as explicitly unacceptable, so the prohibition is concrete rather than abstract. (4) THE LOAD-BEARING ONE: each reviewer's fallback branch must match its ACTUAL capability, derived at runtime from its own tools: frontmatter line rather than hardcoded in the registry — so granting Bash to a currently-clockless reviewer automatically flips the expected branch instead of silently passing the wrong one. A Bash-capable reviewer (code-reviewer, docs-reviewer, test-reviewer) must instruct self-serving the instant with date -u +%Y-%m-%dT%H:%M:%SZ, and must NOT instruct setting timestamp_degraded. A clockless reviewer (plan-reviewer, prd-reviewer, design-map-reviewer, design-spec-reviewer) must instruct appending with "timestamp_degraded": true, and must NOT instruct date -u, which it has no tool to run. (5) Each of the 8 dispatching commands (relay-plan-review, relay-code-review, relay-test-write-review, relay-implement, relay-prd, relay-approve, relay-design-map, relay-design-spec) captures the instant with date -u +%Y-%m-%dT%H:%M:%SZ and passes review_started_at. Note relay-execute needs no capture — it adopts relay-plan-review inline under D7 and inherits it; if the check watches it at all, that must be a documented exemption rather than a silent omission. CRITICAL IMPLEMENTATION TRAP, learned by direct observation while scoping this: in the three Bash-capable reviewers the literal token timestamp_degraded DOES appear, inside the negation "never sets timestamp_degraded". A naive substring grep therefore reports every Bash-capable reviewer as instructing the degraded branch and assertion 4 becomes vacuous — it would pass on a broken file. The check must distinguish an instruction to SET the flag from an instruction NEVER to set it, and the unit tests must include a fixture proving that distinction actually holds, since this is precisely the class of always-pass assertion this repo keeps rejecting. Additionally, and degrading gracefully, assert real OUTPUT rather than only prose: scan PRPs/plans/*.jsonl for verdict entries whose timestamp is at or after the marker recorded in PRPs/reports/efficiency/v0.25.0.json and fail if any such entry carries a T00:00:00 stamp without an accompanying timestamp_degraded flag. Historic pre-marker entries are unrecoverable and MUST be exempt. If the marker file is absent or unparseable, skip that assertion with a visible note rather than failing or silently passing. Also required: the unit tests are test-pair work under R-X strict — the Implementer authors ZERO test files (docs/decisions.md [2026-07-12] and [2026-05-06]), so plan the .test.mjs as test-pair authoring, never as an Implementer task, mirroring feedback-chain.test.mjs's shape of synthetic in-memory fixtures plus a real-wrapper test plus an index.mjs registration test. Finally, documentation/reference/validation-checks.html must gain a per-check section following its own four-part contract with the finding text copied verbatim from the module, its summary table must gain a row, and every ten-to-eleven count reference must be corrected on that page, in documentation/assets/data/search-index.json's excerpt, and in CLAUDE.md's Essential commands line which says 10 static consistency checks; documentation/AGENTS.md is binding and requires a documentation/changelog.html entry. Record the now-closed enforcement gap in docs/context/constraints.md.

## Summary

v0.25.0 fixed the degenerate-timestamp defect that made 45% of the review corpus unusable for before/after measurement, but it fixed it in prose across 15 files with nothing mechanical holding it together. That is precisely the shape of the `prior_feedback` gap — a contract spread across prompt files, silently re-severable by any later edit — which is why `feedback-chain.mjs` exists at all. This plan closes the same gap for the same reason, one release later.

It adds `scripts/validate/checks/timestamp-contract.mjs`, an 11th registered check built on the established module contract: a pure `checkTimestampContract({ files, jsonlEntries, marker })` over already-read inputs plus a thin `runTimestampContractCheck()` wrapper owning the I/O, driven by a registry of the seven jsonl-appending reviewers and eight dispatching commands. Its load-bearing assertion derives each reviewer's expected fallback branch from that reviewer's own `tools:` frontmatter rather than from a hardcoded list, so granting `Bash` to a currently-clockless reviewer flips the expectation automatically instead of passing the wrong branch in silence. A second, gracefully-degrading assertion checks real output rather than only prose: post-marker jsonl entries must not carry a `T00:00:00` stamp without a `timestamp_degraded` flag, with historic entries exempt because their real instants were never observed.

## User Story

As a relay maintainer who just spent a release fixing 45% degenerate timestamps,
I want the `review_started_at` contract mechanically enforced on every commit,
So that the next edit to a reviewer or dispatching command cannot silently re-sever it, and the measurement corpus the efficiency initiative depends on stays trustworthy without anyone remembering to check.

## Problem Statement

`scripts/efficiency.mjs compare` classifies each artifact by its first verdict's timestamp against a recorded release marker. When a reviewer writes `T00:00:00Z` instead of a real instant, a same-day artifact sorts to the wrong side of a mid-day marker and is counted as pre-change. This already corrupted the v0.24.0 comparison, and it is why the wave-2 and wave-3 decisions could not be made.

v0.25.0 fixed the cause: a `review_started_at` input, captured by eight commands and consumed by seven reviewers, with a capability-matched fallback on each side. But the fix is entirely prose. Nothing fails if a new reviewer agent ships without the section, if a dispatching command drops its `date -u` capture, or — most insidiously — if a clockless reviewer is handed the `date -u` self-serve instruction it has no tool to execute, or a Bash-capable one is told to set `timestamp_degraded` and quietly under-reports. The repo has already concluded twice, for `figma_track` and for `prior_feedback`, that a multi-file prose contract without a deterministic gate is a defect waiting to recur. This one has no gate.

## Solution Statement

Add `timestamp-contract` as the 11th check in `scripts/validate/index.mjs`'s `CHECKS` array, following the module contract every sibling uses. Registry-driven so a new reviewer or command is a one-line append rather than a new module, with the two deliberate exclusions (`post-green-reviewer`, `code-reviewer-semantic`) carried as commented entries stating why, so their absence reads as a decision rather than an oversight.

Five prose assertions per registered reviewer and command, plus one output assertion over the jsonl corpus. The capability-derived fallback branch is the assertion that carries the design's weight, and the one whose naive implementation is vacuous: the token `timestamp_degraded` appears inside `never sets timestamp_degraded` in all three Bash-capable reviewers, so a substring test reports every one of them as instructing the degraded branch and the assertion passes on a broken file. The check must distinguish setting from forbidding, and the unit tests must prove that distinction with a fixture that fails under the naive implementation.

## Metadata

| Field | Value |
|-------|-------|
| Type | Validation tooling + documentation |
| Complexity | Medium |
| Systems Affected | `scripts/validate/` (new check + registry), `documentation/` (reference page, changelog, search index), `docs/context/constraints.md`, `CLAUDE.md` |
| Dependencies | The v0.25.0 contract (`e0a0c17`) is shipped and the tree currently satisfies it; `PRPs/reports/efficiency/v0.25.0.json` exists (`2d2beae`); no new npm dependency |
| Estimated Tasks | 6 Implementer tasks (plus the unit-test suite, authored by the test pair) |
| Source | Free-text description (description mode — no source PRD) |
| `phase_type` | `feature` |

`phase_type: feature` rather than `docs`: the `## Files to Change` table contains two `.mjs` source files, so the `docs` signal ("only documentation files, no application source files") does not hold. `design_source` and `phase_scope` are absent by rule — `docs/context/methodology.md` declares no `figma_track` key, and description mode has no PRD to declare `visual_first`.

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `scripts/validate/checks/feedback-chain.mjs` | 1-318 | The module to mirror. Its registry-plus-pure-function-plus-wrapper shape, its `slice()` helper for extracting a section between two markers, its `WATCHED_FILES` export, and its commented explanation of a deliberate registry exclusion are all directly reusable here. |
| P0 | `plugins/relay/agents/plan-reviewer.md` | 1191-1205 | The clockless variant of the contract being enforced: the `### Timestamp discipline (mandatory)` heading, the `T00:00:00Z` unacceptability prose, and the `"timestamp_degraded": true` fallback. |
| P0 | `plugins/relay/agents/code-reviewer.md` | 792-811 | The Bash-capable variant of the same section — `date -u +%Y-%m-%dT%H:%M:%SZ` self-serve, and the phrase `never sets timestamp_degraded` that makes a naive substring assertion vacuous. Read both P0 reviewer sections together; the delta between them IS the load-bearing assertion. |
| P0 | `documentation/reference/validation-checks.html` | 24-52, 142-155 | The page being modified. 24-52 spans every count claim that must change: the `page-subtitle` at 24, the intro callout at 28, the summary table at 33-50, and the totals line at 52. 142-155 is the `feedback-chain` section, the freshest example of the four-part per-check contract to copy. |
| P0 | `documentation/AGENTS.md` | 31-41, 239-286, 400-406 | Binding contract: §2 invariants, §6 three-file registration, §9 modify-an-existing-page checklist. |
| P1 | `scripts/validate/checks/feedback-chain.test.mjs` | 1-587 | The test shape the test pair mirrors: synthetic in-memory fixtures, a `withoutLine` mutation helper, per-assertion-class failure tests, a looped robustness test, a real-wrapper test, and an `index.mjs` registration test. |
| P1 | `scripts/validate/index.mjs` | 19-49 | The registry to extend: the ten `import` statements at 19-28, and the `CHECKS` array from `const CHECKS = [` at 38 through its ten entries and closing `];` at 49. |
| P1 | `docs/context/constraints.md` | 126-145 | The existing `Degenerate T00:00:00Z reviewer timestamps` entry this plan appends to — it records the fix but not the enforcement gap this plan closes. |

## Patterns to Mirror

```js
# SOURCE: scripts/validate/checks/feedback-chain.mjs:83-91
/** Slice `content` from the first line matching `startRe` up to the next line matching `endRe`. */
function slice(content, startRe, endRe) {
  const lines = content.split('\n');
  const start = lines.findIndex((l) => startRe.test(l));
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => endRe.test(l));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n');
}
```

Section extraction between two markers, returning `null` when the opening marker is absent so a missing section is distinguishable from an empty one. Copied by Task 1 to isolate each reviewer's `### Timestamp discipline (mandatory)` block before asserting anything about its contents — scoping the fallback-branch assertions to that block rather than the whole file is what keeps them from matching unrelated prose elsewhere in a 1300-line agent.

```js
# SOURCE: scripts/validate/checks/feedback-chain.mjs:62-66
const PAIRS = [
  { command: 'plugins/relay/commands/relay-plan.md', agent: PLAN_WRITER },
  { command: 'plugins/relay/commands/relay-write-test.md', agent: 'plugins/relay/agents/test-writer.md' },
  { command: 'plugins/relay/commands/relay-implement.md', agent: 'plugins/relay/agents/implementer.md' },
];
```

The registry shape: a flat array of plain objects, appended to rather than replaced when the contract grows. Copied by Task 1 for both the seven-reviewer registry and the eight-command registry.

```js
# SOURCE: scripts/validate/checks/feedback-chain.mjs:55-58
 * `docs-updater` is deliberately absent — `/relay-implement` removed
 * `docs_prior_feedback` from its dispatch payload on purpose, and the docs
 * pair shows zero measured churn. Adding it here would assert a contract
 * that does not exist.
```

The precedent for documenting a deliberate registry exclusion in the module itself, so a later reader does not "fix" the omission. Copied by Task 1 for `post-green-reviewer` (Bash-capable, but appends no jsonl and has no `Write` tool) and `code-reviewer-semantic` (returns structured JSON to its parent, no `Write` tool).

```js
# SOURCE: scripts/validate/checks/feedback-chain.mjs:296-318
export function runFeedbackChainCheck() {
  /** @type {Record<string, string | null>} */
  const files = {};
  const findings = [];

  for (const path of WATCHED_FILES) {
    const abs = resolve(path);
    if (!existsSync(abs)) {
      files[path] = null;
      findings.push({ message: `missing file: ${path}`, file: path, line: null });
      continue;
    }
    try {
      files[path] = readFileSync(abs, 'utf-8');
    } catch (err) {
      files[path] = null;
      findings.push({ message: `could not read ${path}: ${err.message}`, file: path, line: null });
    }
  }

  const result = checkFeedbackChain({ files });
  return { name: CHECK_NAME, ok: findings.length === 0 && result.ok, findings: [...findings, ...result.findings] };
}
```

The thin wrapper: all file I/O lives here so the pure function stays testable with in-memory fixtures, missing and unreadable files become loud findings rather than throws, and the two finding sets are concatenated. Copied by Task 1, extended to also read the jsonl corpus and the efficiency marker for the output assertion.

```html
# SOURCE: documentation/reference/validation-checks.html:142-155
      <h2 id="feedback-chain">feedback-chain</h2>

      <p><strong>Functionality.</strong> Verifies that the writer-side <code>prior_feedback</code> contract stays wired end to end across the six prompt files it watches (three command/agent pairs). ...</p>
      <p><strong>Passes when</strong> all six watched files carry the contract — the current tree state. ...</p>
      <p><strong>Fails when</strong> any link in the chain is cut. Representative findings:</p>
      <pre><code class="language-default">command does not forward prior_feedback to plugins/relay/agents/plan-writer.md; its retries regenerate blind</code></pre>
      <p><strong>Unit tests (23).</strong> A baseline fixture satisfying every invariant passes; ...</p>
```

The four-part per-check contract in the exact markup the page uses: `<h2 id="...">`, a `<strong>Functionality.</strong>` paragraph, a `<strong>Passes when</strong>` paragraph, a `<strong>Fails when</strong>` paragraph closing with a colon, a `<pre><code class="language-default">` block holding verbatim finding text, and a `<strong>Unit tests (N).</strong>` paragraph. Note this page uses literal em-dashes, never `&mdash;`. Copied by Task 3.

```html
# SOURCE: documentation/reference/validation-checks.html:47
          <tr><td><a href="#feedback-chain">feedback-chain</a></td><td>writer-side <code>prior_feedback</code> contract wired end to end</td><td>23</td></tr>
```

The summary-table row shape (Check / What it verifies / Unit tests). Copied by Task 3.

```html
# SOURCE: documentation/changelog.html:37-42
      <h3 id="v0-25-0-added">Added</h3>
      <ul>
        <li><strong><code>scripts/validate/checks/feedback-chain.test.mjs</code></strong>
          &mdash; 23 <code>node:test</code> unit tests for the <code>feedback-chain</code>
          check, authored by the test-writer/test-reviewer pair rather than the
          Implementer, per R-X strict (<code>docs/decisions.md</code>
```

The changelog subsection shape: an `<h3 id="<version>-<section>">` using keepachangelog vocabulary, then a `<ul>` whose every `<li>` opens with the touched path in `<strong><code>`, an `&mdash;` separator, and prose stating what changed and why. HTML entities rather than literal characters. Copied by Task 5, with the id prefixed `unreleased-` since no release is being cut.

```markdown
# SOURCE: docs/context/constraints.md:126-131
**Degenerate `T00:00:00Z` reviewer timestamps — historic entries are
unrecoverable (2026-07-31).** 128 of 284 verdict entries (45.1%) across
`PRPs/plans/*.jsonl` carry a date-only `T00:00:00Z` stamp instead of a
real UTC instant — the honest output of four clockless reviewer agents
```

The existing governance entry this plan extends: a bolded title carrying its own date, then the evidence, then the consequence. Copied by Task 6, which appends the enforcement-gap closure to this same entry rather than opening a competing one.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `scripts/validate/checks/timestamp-contract.mjs` | CREATE | The 11th check. Pure function plus thin wrapper, registry-driven, scoped to `plugins/relay/` like every sibling. |
| `scripts/validate/checks/timestamp-contract.test.mjs` | CREATE | The unit-test suite. Authored by `test-writer`/`test-reviewer` under R-X strict — never by the Implementer. Its passing count is a precondition for Task 3's cited figure. |
| `scripts/validate/index.mjs` | UPDATE | Import and register `runTimestampContractCheck` in the `CHECKS` array; without this the module is dead code and `npm run validate` still reports ten. |
| `documentation/reference/validation-checks.html` | UPDATE | New per-check section, new summary-table row, and every ten-to-eleven count correction (intro callout, subtitle, totals line). |
| `documentation/assets/data/search-index.json` | UPDATE | The page's excerpt says "ten static checks" and carries a unit-test total; both go stale. AGENTS.md §6.2. |
| `CLAUDE.md` | UPDATE | The Essential commands line says `10 static consistency checks`. |
| `documentation/changelog.html` | UPDATE | Mandatory per AGENTS.md §7.4. Lands under `Unreleased`, which currently reads "Nothing queued yet." |
| `docs/context/constraints.md` | UPDATE | Record that the enforcement gap left open by v0.25.0 is now closed, appended to the existing timestamp entry. |

## NOT Building (Scope Limits)

- **No change to any reviewer agent or dispatching command.** The tree already satisfies the contract; this plan observes it, never edits it. If the check finds a real violation the fix is a separate change — and that is the check working, not a defect in it.
- **No repair of historic jsonl entries.** Their real instants were never observed and cannot be reconstructed. The output assertion exempts everything before the v0.25.0 marker by design; treating them as violations would make the check permanently red.
- **No `plugin.json` bump and no release cut.** Every file touched lives outside `plugins/relay/`, so AGENTS.md §7.5's bump rule does not fire. The entry lands under `Unreleased`.
- **No new page, no new NAV entry, no new CSS class.** `reference/validation-checks.html` already exists and is registered; AGENTS.md §9 governs, not §8.
- **No enforcement of `post-green-reviewer` or `code-reviewer-semantic`.** Neither appends a jsonl verdict and neither has a `Write` tool. They are carried as commented exclusions, not silently omitted.
- **No coverage of `relay-execute`.** It adopts `/relay-plan-review` inline under D7 and inherits the capture, so requiring its own `date -u` would assert a contract that does not exist. Documented as an exemption in the module.
- **No fix for reviewer non-determinism.** Still the open item in `constraints.md`; untouched here.

## Step-by-Step Tasks

### Task 1: CREATE `scripts/validate/checks/timestamp-contract.mjs`

**ACTION**: Delivers **AC-A1**, **AC-A2**, **AC-A3**, **AC-A4** and **AC-A6**. Write the check module following the sibling contract: export a pure `checkTimestampContract({ files, jsonlEntries, marker })` taking already-read inputs, and a thin `runTimestampContractCheck()` wrapper owning all I/O, both returning `{ name, ok, findings: [{ message, file, line }] }`. Carry two registries — the seven jsonl-appending reviewers and the eight dispatching commands — plus a `WATCHED_FILES` export derived from them. Document the three deliberate exclusions (`post-green-reviewer`, `code-reviewer-semantic`, `relay-execute`) in module comments stating why, mirroring the `docs-updater` precedent. Per reviewer, assert: the `review_started_at` input is declared; a `### Timestamp discipline (mandatory)` section exists; that section names `T00:00:00` as explicitly unacceptable; and the fallback branch matches capability, where capability is **derived at runtime by parsing that reviewer's own `tools:` frontmatter line for a `Bash` entry**, never hardcoded. Bash-capable means the section instructs `date -u +%Y-%m-%dT%H:%M:%SZ` and does NOT instruct setting the degraded flag; clockless means the reverse. The degraded-flag test must distinguish an instruction to SET the flag from the phrase `never sets timestamp_degraded`, which occurs verbatim in all three Bash-capable reviewers — a plain substring test is vacuous and would pass on a broken file. Per command, assert it captures `date -u +%Y-%m-%dT%H:%M:%SZ` and passes `review_started_at`. Beyond the prose assertions, add the **AC-A6** output assertion: the wrapper additionally reads `PRPs/plans/*.jsonl` and the marker in `PRPs/reports/efficiency/v0.25.0.json`, and the pure function fails any verdict entry whose timestamp is at or after that marker while carrying a `T00:00:00` component without an accompanying `timestamp_degraded` flag. Pre-marker entries are exempt by construction — their real instants were never observed — and an absent or unparseable marker skips this assertion with a visible note rather than failing or silently passing. Scope every prompt-file read to `plugins/relay/`, never `prp-core/`.

**MIRROR**: `# SOURCE: scripts/validate/checks/feedback-chain.mjs:83-91` — the section-slicing helper; plus the registry and exclusion-comment anchors from the same module.

**VALIDATE**:
```bash
set -euo pipefail
node --check scripts/validate/checks/timestamp-contract.mjs
node -e '
import("./scripts/validate/checks/timestamp-contract.mjs").then((m) => {
  if (typeof m.checkTimestampContract !== "function") { console.error("FAIL: checkTimestampContract not exported"); process.exit(1); }
  if (typeof m.runTimestampContractCheck !== "function") { console.error("FAIL: runTimestampContractCheck not exported"); process.exit(1); }
  const real = m.runTimestampContractCheck();
  if (!real.ok) { console.error("FAIL: check reports findings against the compliant tree: " + JSON.stringify(real.findings)); process.exit(1); }

  // Anti-vacuity: the negation trap. A Bash-capable reviewer whose section
  // says "never sets timestamp_degraded" must PASS; one instructed to SET the
  // flag must FAIL. A naive substring test cannot tell these apart.
  const bashOk = "tools: Read, Write, Bash\n\n### Timestamp discipline (mandatory)\n\nMUST be review_started_at verbatim, never T00:00:00Z.\nIf not supplied, obtain it with date -u +%Y-%m-%dT%H:%M:%SZ before appending -- this agent never sets timestamp_degraded.\n\n## Next\n";
  const bashBad = bashOk.replace("this agent never sets timestamp_degraded", "add \"timestamp_degraded\": true to that object");
  const pass = m.checkTimestampContract({ files: { "plugins/relay/agents/code-reviewer.md": bashOk }, jsonlEntries: [], marker: null });
  const fail = m.checkTimestampContract({ files: { "plugins/relay/agents/code-reviewer.md": bashBad }, jsonlEntries: [], marker: null });
  const nPass = pass.findings.filter((f) => /code-reviewer/.test(f.file || "")).length;
  const nFail = fail.findings.filter((f) => /code-reviewer/.test(f.file || "")).length;
  if (!(nFail > nPass)) { console.error(`FAIL: the negation trap is not handled -- compliant fixture produced ${nPass} findings, SET-instruction fixture produced ${nFail}; the assertion is vacuous`); process.exit(1); }
  console.log("PASS: exports present, real tree clean, negation trap handled");
}).catch((e) => { console.error("FAIL: " + e.message); process.exit(1); });
'
```

### Task 2: UPDATE `scripts/validate/index.mjs` — register the check

**ACTION**: Delivers **AC-A5**. Add `import { runTimestampContractCheck } from './checks/timestamp-contract.mjs';` alongside the ten existing imports, and append `runTimestampContractCheck,` as the eleventh entry of the `CHECKS` array. Position it last, matching the append-only convention every prior check followed, so the runner's output order stays stable for anyone diffing it. Change nothing else in the file.

**MIRROR**: `# SOURCE: scripts/validate/checks/feedback-chain.mjs:296-318` — the wrapper whose exported name is what gets registered here.

**VALIDATE**:
```bash
set -euo pipefail
grep -q "import { runTimestampContractCheck } from './checks/timestamp-contract.mjs';" scripts/validate/index.mjs
node -e '
const { readFileSync } = require("fs");
const s = readFileSync("scripts/validate/index.mjs", "utf8");
const block = s.slice(s.indexOf("const CHECKS"), s.indexOf("];", s.indexOf("const CHECKS")) + 2);
if (!/runTimestampContractCheck/.test(block)) { console.error("FAIL: not in the CHECKS array"); process.exit(1); }
const n = (block.match(/run\w+Check/g) || []).length;
if (n !== 11) { console.error(`FAIL: CHECKS holds ${n} entries, expected 11`); process.exit(1); }
console.log("PASS: registered, 11 checks");
'
npm run validate 2>&1 | grep -qE "^11 passed, 0 failed"
echo "PASS: npm run validate reports 11 passed"
```

### Task 3: UPDATE `documentation/reference/validation-checks.html` — new section and every count

**ACTION**: Delivers **AC-A7** and **AC-A8**, and transitively enforces **AC-A12** (its VALIDATE runs the test suite the test pair authors, so it fails closed if that suite is absent or red). Insert a `<h2 id="timestamp-contract">timestamp-contract</h2>` section after `feedback-chain` and before `<h2 id="eval-layer">`, carrying all four contract parts, with every finding string in the failing example copied character-for-character from the module rather than paraphrased. Add a summary-table row. Correct every ten-to-eleven reference: the `<p class="page-subtitle">` ("ten static checks"), the intro callout ("runs all ten"), and the totals line ("reports 10 checks" plus the unit-test figure, which becomes the current 111 plus the new suite's real count). Verify the recomputed total against the sum of the summary table's own Unit tests column rather than asserting it by hand. This page uses literal em-dashes, never `&mdash;`.

**MIRROR**: `# SOURCE: documentation/reference/validation-checks.html:142-155` — the four-part per-check contract; and `:46` for the summary-table row.

**VALIDATE**:
```bash
set -euo pipefail
html=documentation/reference/validation-checks.html
section=$(tr -d '\r' < "$html" | awk '/<h2 id="timestamp-contract">/{f=1; print; next} f && /<h2 /{exit} f')
[ -n "$section" ] || { echo "FAIL: no timestamp-contract section"; exit 1; }
for m in "<strong>Functionality.</strong>" "<strong>Passes when</strong>" "<strong>Fails when</strong>" "<strong>Unit tests (" "<pre><code"; do
  printf '%s' "$section" | grep -qF "$m" || { echo "FAIL: section missing $m"; exit 1; }
done
cited=$(printf '%s' "$section" | grep -oE 'Unit tests \([0-9]+\)' | grep -oE '[0-9]+')
actual=$(node --test scripts/validate/checks/timestamp-contract.test.mjs 2>&1 | grep -aE 'tests [0-9]+$' | grep -oE '[0-9]+$' | head -1)
[ -n "$actual" ] || { echo "FAIL: timestamp-contract.test.mjs reported no test count (absent or crashed)"; exit 1; }
[ "$cited" = "$actual" ] || { echo "FAIL: page cites $cited unit tests, suite reports $actual"; exit 1; }
flat=$(tr -d '\r' < "$html" | tr '\n' ' ' | tr -s ' ')
if printf '%s' "$flat" | grep -qE 'runs all ten|reports 10 checks|ten static checks'; then
  echo "FAIL: a stale ten-check claim survives on the page"; exit 1
fi
printf '%s' "$flat" | grep -qE 'runs all eleven'
printf '%s' "$flat" | grep -qE 'reports 11 checks'
printf '%s' "$flat" | grep -qF '<a href="#timestamp-contract">timestamp-contract</a>'
sum=$(tr -d '\r' < "$html" | awk '/<tbody>/{f=1} /<\/tbody>/{f=0} f' | grep -oE '<td>[0-9]+</td>' | grep -oE '[0-9]+' | awk '{s+=$1} END {print s}')
stated=$(printf '%s' "$flat" | grep -oE 'Totals:</strong> [0-9]+' | grep -oE '[0-9]+')
[ "$sum" = "$stated" ] || { echo "FAIL: totals line states $stated, summary table column sums to $sum"; exit 1; }
echo "PASS: section complete, $actual tests cited, totals reconcile to $sum"
```

### Task 4: UPDATE `documentation/assets/data/search-index.json` and `CLAUDE.md` — count references

**ACTION**: Delivers **AC-A9**. In the search index, update the `excerpt` of the entry whose `path` is `reference/validation-checks.html` from "ten static checks" to "eleven static checks" and carry the recomputed unit-test total; leave `title`, `path`, and `category` byte-identical, since the page's identity is unchanged. In `CLAUDE.md`, change the Essential commands line from `10 static consistency checks` to `11 static consistency checks`; note the phrase spans a line break in the source, so edit it in place rather than matching it as one string.

**MIRROR**: `# SOURCE: documentation/reference/validation-checks.html:47` — the summary-table count column, which both the excerpt total and this task's figures must agree with.

**VALIDATE**:
```bash
set -euo pipefail
node -e '
const { readFileSync } = require("fs");
const idx = JSON.parse(readFileSync("documentation/assets/data/search-index.json", "utf8"));
const e = idx.find((x) => x.path === "reference/validation-checks.html");
if (!e) { console.error("FAIL: no search-index entry"); process.exit(1); }
if (/ten static checks/.test(e.excerpt)) { console.error("FAIL: excerpt still says ten"); process.exit(1); }
if (!/eleven static checks/.test(e.excerpt)) { console.error("FAIL: excerpt does not say eleven"); process.exit(1); }
if (e.title !== "Validation checks" || e.category !== "Reference") { console.error("FAIL: entry identity changed"); process.exit(1); }
const html = readFileSync("documentation/reference/validation-checks.html", "utf8").replace(/\r/g, "");
const stated = (html.match(/Totals:<\/strong> (\d+)/) || [])[1];
const inExcerpt = (e.excerpt.match(/(\d+)\s+total/) || [])[1];
if (!stated || !inExcerpt || stated !== inExcerpt) { console.error(`FAIL: excerpt total ${inExcerpt} disagrees with page totals ${stated}`); process.exit(1); }
console.log("PASS: excerpt reconciles with the page");
'
claude_flat=$(tr -d '\r' < CLAUDE.md | tr '\n' ' ' | tr -s ' ')
if printf '%s' "$claude_flat" | grep -qE '10 static consistency checks'; then
  echo "FAIL: CLAUDE.md still says 10 static consistency checks"; exit 1
fi
printf '%s' "$claude_flat" | grep -qE '11 static consistency checks'
echo "PASS: CLAUDE.md updated to 11"
```

### Task 5: UPDATE `documentation/changelog.html` — log under `Unreleased`

**ACTION**: Delivers **AC-A10**. Replace the `Unreleased` block's `<p>Nothing queued yet.</p>` placeholder with a real entry using the keepachangelog vocabulary from AGENTS.md §7.2 — `Added` is correct, since this ships a new check and a new test suite. Name `timestamp-contract`, state that it makes the v0.25.0 `review_started_at` contract mechanically enforced, and say plainly that the contract previously had no gate. Do not cut a release, do not rename `Unreleased`, and do not bump `plugins/relay/.claude-plugin/plugin.json` — nothing under `plugins/relay/` is touched, so AGENTS.md §7.5's rule does not fire. This file uses `&mdash;` entities, unlike the reference page. No emojis, per AGENTS.md §2.5.

**MIRROR**: `# SOURCE: documentation/changelog.html:37-42` — the changelog subsection shape.

**VALIDATE**:
```bash
set -euo pipefail
flat=$(tr -d '\r' < documentation/changelog.html | tr '\n' ' ' | tr -s ' ')
unrel=$(printf '%s' "$flat" | sed 's/.*<h2 id="unreleased">Unreleased<\/h2>//' | sed 's/<h2 id="v0-25-0">.*//' | sed 's/^ *//; s/ *$//')
[ -n "$unrel" ] || { echo "FAIL: Unreleased block is empty"; exit 1; }
if printf '%s' "$unrel" | grep -qF 'Nothing queued yet.'; then
  echo "FAIL: the Unreleased placeholder was not replaced"; exit 1
fi
printf '%s' "$unrel" | grep -qF 'timestamp-contract' || { echo "FAIL: Unreleased entry does not name the check"; exit 1; }
printf '%s' "$unrel" | grep -qF 'review_started_at' || { echo "FAIL: Unreleased entry does not name the contract"; exit 1; }
grep -q '"version": "0.25.0"' plugins/relay/.claude-plugin/plugin.json || { echo "FAIL: plugin.json version changed; this change ships no plugin asset"; exit 1; }
echo "PASS: changelog entry recorded under Unreleased, no release cut"
```

### Task 6: UPDATE `docs/context/constraints.md` — record the closed gap

**ACTION**: Delivers **AC-A11**. Append a dated closure paragraph to the existing `Degenerate T00:00:00Z reviewer timestamps` entry (line 126), stating that v0.25.0 fixed the behavior but left the contract unenforced across 15 prose files, and that `timestamp-contract` now gates it on every commit. Extend the existing entry rather than opening a competing one — the two facts belong to one story, and splitting them invites a future reader to fix the gap twice. Leave the still-open `Reviewer non-determinism across attempts` item untouched and unstruck; it remains the only genuinely open item in this section.

**MIRROR**: `# SOURCE: docs/context/constraints.md:126-131` — the entry being extended, and its bolded-title-then-evidence-then-consequence shape.

**VALIDATE**:
```bash
set -euo pipefail
flat=$(tr -d '\r' < docs/context/constraints.md | tr '\n' ' ' | tr -s ' ')
printf '%s' "$flat" | grep -qF 'timestamp-contract' || { echo "FAIL: the closure is not recorded"; exit 1; }
printf '%s' "$flat" | grep -qF 'Degenerate `T00:00:00Z` reviewer timestamps' || { echo "FAIL: the original entry was damaged"; exit 1; }
printf '%s' "$flat" | grep -qF 'Reviewer non-determinism across attempts.' || { echo "FAIL: the still-open item was damaged"; exit 1; }
if printf '%s' "$flat" | grep -qE '~~\*\*Reviewer non-determinism'; then
  echo "FAIL: the still-open reviewer-non-determinism item was wrongly struck through"; exit 1
fi
echo "PASS: closure recorded, adjacent open item intact"
```

## Validation Commands

### Level 1 — STATIC_ANALYSIS

```bash
set -euo pipefail
node --check scripts/validate/checks/timestamp-contract.mjs
node --check scripts/validate/checks/timestamp-contract.test.mjs
node -e 'JSON.parse(require("fs").readFileSync("documentation/assets/data/search-index.json","utf8")); console.log("search-index.json parses");'
node -e '
const { readFileSync } = require("fs");
for (const f of ["documentation/reference/validation-checks.html", "documentation/changelog.html"]) {
  const s = readFileSync(f, "utf8");
  if (/<style[\s>]/.test(s)) { console.error(`FAIL: ${f} contains an inline <style> block`); process.exit(1); }
  if (/\sstyle="/.test(s)) { console.error(`FAIL: ${f} contains an inline style attribute`); process.exit(1); }
  if (/href="\/documentation\//.test(s)) { console.error(`FAIL: ${f} contains an absolute documentation path`); process.exit(1); }
  if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(s)) { console.error(`FAIL: ${f} contains an emoji`); process.exit(1); }
}
console.log("AGENTS.md section 2 invariants hold");
'
if grep -rn "prp-core" scripts/validate/checks/timestamp-contract.mjs; then
  echo "FAIL: the new check references prp-core, which is reference-only"; exit 1
else
  echo "PASS: no prp-core reference"
fi
```

### Level 2 — UNIT_TESTS

```bash
set -euo pipefail
node --test scripts/validate/checks/timestamp-contract.test.mjs
node --test scripts/validate/checks/feedback-chain.test.mjs
node --test scripts/validate/checks/gating-structure.test.mjs
```

All three must exit 0. `node --test` exits non-zero on any failing test, so the tool's own status propagates and `set -e` fails the block. The single-file form is used deliberately: passing a directory to `node --test` triggers a `MODULE_NOT_FOUND` resolution failure in this repo. The two sibling suites are included to catch collateral damage from the `index.mjs` edit, which both of their registration tests read.

### Level 3 — INTEGRATION

```bash
set -euo pipefail
npm run validate 2>&1 | tee /dev/stderr | grep -qE "^11 passed, 0 failed"
node -e '
const { readFileSync } = require("fs");
const html = readFileSync("documentation/reference/validation-checks.html", "utf8").replace(/\r/g, "");
const index = readFileSync("scripts/validate/index.mjs", "utf8");
const registered = (index.slice(index.indexOf("const CHECKS"), index.indexOf("];", index.indexOf("const CHECKS"))).match(/run\w+Check/g) || []).length;
const documented = (html.match(/<h2 id="[a-z-]+">/g) || []).filter((h) => !/id="summary"|id="eval-layer"/.test(h)).length;
if (registered !== documented) {
  console.error(`FAIL: index.mjs registers ${registered} checks but the page documents ${documented}`);
  process.exit(1);
}
console.log(`PASS: ${registered} registered checks, ${documented} documented`);
'
```

`npm run validate` must report `11 passed, 0 failed`; it exits non-zero on any failing check. The Node block then independently reconciles registered checks against documented per-check sections, so the page cannot fall behind again without this level failing — the same self-policing guard the previous change installed at ten.

## Acceptance Criteria

R8b (PRD AC-N token check) does not apply in description mode — this plan has no source PRD, so no acceptance criterion carries a `(PRD AC-N)` reference.

- **AC-A1:** `scripts/validate/checks/timestamp-contract.mjs` exports a pure `checkTimestampContract` operating on already-read inputs and a thin `runTimestampContractCheck` wrapper owning all file I/O, both returning the shared `{ name, ok, findings: [{ message, file, line }] }` contract, with missing or unreadable files becoming loud findings rather than throws.
- **AC-A2:** The module is registry-driven — seven jsonl-appending reviewers and eight dispatching commands — and carries commented exclusions for `post-green-reviewer`, `code-reviewer-semantic`, and `relay-execute` that state the reason, so each absence reads as a decision.
- **AC-A3:** For every registered reviewer the check asserts the `review_started_at` declaration, the presence of a `### Timestamp discipline (mandatory)` section, and that the section names `T00:00:00` as explicitly unacceptable; for every registered command it asserts the `date -u +%Y-%m-%dT%H:%M:%SZ` capture and the `review_started_at` pass-through.
- **AC-A4:** Each reviewer's expected fallback branch is derived at runtime from that reviewer's own `tools:` frontmatter line, never hardcoded, so granting `Bash` to a clockless reviewer flips the expectation automatically. The degraded-flag assertion distinguishes an instruction to SET the flag from the phrase `never sets timestamp_degraded`, and is demonstrably non-vacuous: a fixture instructing a Bash-capable reviewer to SET the flag produces strictly more findings than the compliant fixture.
- **AC-A5:** `scripts/validate/index.mjs` imports `runTimestampContractCheck` and lists it as the eleventh entry of `CHECKS`, and `npm run validate` reports `11 passed, 0 failed` against the current tree.
- **AC-A6:** The check additionally asserts real output, not only prose: jsonl verdict entries at or after the marker in `PRPs/reports/efficiency/v0.25.0.json` must not carry a `T00:00:00` stamp without a `timestamp_degraded` flag. Pre-marker entries are exempt, and an absent or unparseable marker file skips this assertion with a visible note rather than failing or silently passing.
- **AC-A7:** `documentation/reference/validation-checks.html` contains a `timestamp-contract` section carrying all four parts of the page's per-check contract, with every finding string in the failing example copied verbatim from the module rather than paraphrased.
- **AC-A8:** Every ten-to-eleven reference on that page is corrected — page subtitle, intro callout, summary table (new row), and totals line — and the stated unit-test total equals the sum of the summary table's own Unit tests column.
- **AC-A9:** The `reference/validation-checks.html` entry in `documentation/assets/data/search-index.json` describes eleven static checks with a unit-test total agreeing with the page and unchanged `title`/`path`/`category`; `CLAUDE.md`'s Essential commands line reads `11 static consistency checks`.
- **AC-A10:** `documentation/changelog.html` carries an entry under `Unreleased` replacing the "Nothing queued yet." placeholder, naming `timestamp-contract` and `review_started_at`, with no release cut and no `plugin.json` version change.
- **AC-A11:** `docs/context/constraints.md` records that the enforcement gap left open by v0.25.0 is closed, appended to the existing timestamp entry, with the still-open reviewer-non-determinism item left intact and unstruck.
- **AC-A12:** The unit-test suite `scripts/validate/checks/timestamp-contract.test.mjs` exists and exits 0 under `node --test`, exercising the pure function with synthetic in-memory fixtures, covering every assertion class above with mutation-style fixtures that genuinely fail when the guarded property is broken, and including a real-wrapper test plus an `index.mjs` registration test. It must contain a fixture that fails under a naive substring implementation of the degraded-flag rule, since that is the assertion most likely to be silently vacuous.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| The degraded-flag assertion is implemented as a plain substring test, making AC-A4 vacuous — it would pass against every Bash-capable reviewer including a broken one | High | High — the load-bearing assertion silently does nothing, and the check gives false assurance | Task 1's own VALIDATE constructs both fixtures and fails unless the SET-instruction one produces strictly more findings; AC-A12 additionally requires a unit test that fails under the naive implementation. |
| The Implementer authors `timestamp-contract.test.mjs` directly, violating R-X strict and drawing a blanket rejection at code review | Medium | High — the whole diff is rejected, not just the test file | The file is marked test-pair-authored in `## Files to Change`, no task ACTION creates it, and Task 3 consumes it only by running it. Sequencing is stated in `## Notes`. |
| The check hardcodes the Bash/clockless split instead of deriving it, so granting `Bash` to a clockless reviewer passes with the wrong branch | Medium | Medium — the check drifts out of sync with reality exactly when it matters | AC-A4 requires runtime derivation from the `tools:` line; the risk is called out in Task 1's ACTION rather than left implicit. |
| The output assertion turns the check permanently red because 45% of historic entries are midnight-stamped | Medium | High — a red gate gets disabled rather than fixed | AC-A6 exempts pre-marker entries by construction and requires a visible skip when the marker is missing; Level 3 confirms the whole suite is green on the current tree. |
| Cited unit-test counts drift from the suite's real count | Medium | Medium — the page makes a false coverage claim | Task 3 reconciles the cited count against a live `node --test` run, the totals line against the table's own column, and Task 4 the excerpt against the page. |
| `research-codebase` / `research-web` returned no findings — grounding was done by direct reads | n/a | Low | Documented in `## Notes`; every `# SOURCE:` anchor cites a real, verified `file:line`, each read in full before citation. |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.

**Ordering deviation, and why it is not a methodology change.** `tdd: false` selects test-after, and this plan deliberately runs the test pair before Task 3. The reason is a data dependency, not a change of methodology: Task 3 cites the suite's unit-test count on a published page, and a count cannot be cited before the suite exists. The same deviation, for the same reason, was used and accepted for `feedback-chain.test.mjs`. The `tdd:` value is untouched and the test pair remains the sole author of the test file. Concretely: run `/relay-write-test` and `/relay-test-write-review` after Tasks 1-2 and before Task 3. Task 3 fails closed if that ordering is not respected — its VALIDATE invokes the suite directly.

**Grounding was performed by direct reads, not research subagents.** Phase 2 GROUNDING dispatched neither `research-codebase` nor `research-web`. This work is entirely internal and has no external-pattern component, so `research-web` would return a `degradation_reason` by construction; the module being mirrored and the contract being enforced were both read end-to-end before authoring.

**Correction, attempt 2.** The first draft of this section claimed every `# SOURCE:` anchor had been verified. That claim was false: plan review found four anchors and one `## Mandatory Reading` range that did not bound their own quoted content, four of them off by one or two lines. The cause was reading line numbers off `sed -n 'A,Bp'` output windows, where the first printed line is easy to misattribute, instead of off `grep -n`, which reports the true number. All anchors and ranges in this attempt were re-derived with `grep -n` against the tree at commit `2d2beae` and are recorded here as verified by that method, not by inspection.

**Every VALIDATE command in this plan was executed against the unmodified tree before the plan was written.** Tasks 1 through 6 each exit non-zero today. The section-matching, count-matching, and JSON-parsing mechanics were additionally verified in the positive direction against existing content — the `feedback-chain` section, the current `reports 10 checks` claim, the current `ten static checks` excerpt, and `CLAUDE.md`'s current `10 static consistency checks` line — so none is an always-fail grep. The tree uses CRLF, so every command matching a phrase that spans a line break normalizes with `tr -d '\r' | tr '\n' ' ' | tr -s ' '` first; `CLAUDE.md`'s count phrase is exactly such a case, wrapping between "10 static" and "consistency checks".

**The negation trap is the reason this plan exists in this shape.** While scoping it, a naive `grep -c timestamp_degraded` reported all three Bash-capable reviewers as instructing the degraded branch, because each contains the phrase `never sets timestamp_degraded`. Had the check been written that way, AC-A4 would pass on a file that violates the contract — the precise always-pass failure class this repo's plan reviews keep rejecting. It is called out in the Source, in Task 1's ACTION, in AC-A4, in AC-A12, and as the top risk, deliberately, because it is the one detail whose omission would make the whole check worthless while still reporting green.

**No plugin asset is touched, so no version bump is due.** AGENTS.md §7.5 requires a bump on a minor/major release cut or a patch shipping something under `plugins/relay/`. Every file here is outside that tree. Task 5's VALIDATE asserts `plugin.json` still reads `0.25.0`.

**Dogfood value.** This plan is intended to be driven through `/relay-implement` rather than by direct edits. The previous change closed its docs debt with the Implementer role adopted inline, which meant wave 2's `implementer` pre-emission self-check never ran and the resulting code-review numbers said nothing about it. Running this one through the real agent produces the first artifacts that can actually speak to wave 2, measured against the `v0.25.0` marker recorded at `2026-07-31T18:02:16Z` — the first boundary in the corpus after which timestamps are trustworthy.

*Generated: 2026-07-31*
*Approved: 2026-07-31*
*Status: IMPLEMENTED*
