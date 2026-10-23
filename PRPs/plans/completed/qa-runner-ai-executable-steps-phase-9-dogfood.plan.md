# Feature: Dogfood (Phase 9 of qa-runner-ai-executable-steps)

```
**Decision Gate**
- Active context: none
- Activated criteria: before any planning (`docs/decision-gate.md`); cross-cutting artifact creation (a re-frozen pre-run table, a metrics tool and a runbook that downstream readers and the operator's close decision consume); secret handling in run evidence (extracted verification codes, judged captures, dedicated-account values); network- and store-touching sites under the local-only guard (the counted runs themselves, which this plan prepares and never executes); a phase whose closing clauses (the counted runs, the reading of every pass, the close decision) cannot be performed by the autonomous loop
- Decisions found:
  - [2026-09-25] "Executing a QA report's cases, backed by a project-local test-auth kit under `PRPs/auth/`, is a registered future capability": closed outcome vocabulary, a runner pass is evidence and not approval, the local-only guard is permanent, outward-effect cases run only against local stand-ins the project declares, secrets never reach reports
  - [2026-10-22] "The QA runner's `needs-human` means only what no AI agent can execute alone" (vocabulary v3, registered at the 0.47.0 cut): impossible and gap classes, executed product defects, judged steps, local channel sources, dedicated-role writes, the actionable environment halt; phase 9 measures it
  - [2026-10-06] "Provisioning the visual tooling's `node_modules` in every new plugin cache is a registered backlog item (F10)": answered by an actionable halt; the zero-manual-preparation clause of AC-26 is measured here
  - `PRPs/prds/qa-runner-grounding-vocabulary-v2.prd.md` Decisions Log: the frozen pre-run classification, the frozen-table discipline (never edited after the run, corrections only as dated addenda), `/relay-qa-report` unchanged
  - [2026-05-18] Pillar 2/3 boundary: `/relay-execute` never commits, pushes or opens a PR; the counted runs, the reading verdicts and the close decision are operator-owned
  - [2026-07-10] R-X strict: the Implementer authors zero test files; test edits go through the test pair's lifecycle ledger
  - [2026-04-19] "Secret redaction policy for Test Runner reports": layered policy; [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`
- Applicable anti-patterns:
  - "Emitting secret values in run reports or logs": the tooling prints counts, names and verdict words only, never a token, a session value, an extracted code or an account value
  - "Writing pipeline artifacts under `.claude/`"
  - "Weakening or deleting tests to make the auto-correction loop turn green": no existing test is touched; a metric that is missed is reported as missed, never repaired by editing a results file, a plan or the frozen table
  - "Relying on interactive permission prompts in the autonomous loop": the implementer never runs a counted run, a mint, a seed or a write; every step that needs the operator is an explicit OPERATOR step in the runbook
  - "Treating `plugins/prp-core/` as active relay code"
- Applicable architectural rules:
  - Interactivity boundary: no new extension; the runbook's OPERATOR steps are the only place the operator is asked for anything, and they are performed outside this plan's execution
  - Command versus script separation: the command session owns judgment (the plan and the verdicts), `qa-run.mjs` owns every deterministic mutation; this phase changes neither
  - The local-only guard is a hard failure at every network- or store-touching site and stays on for the counted runs; no non-local origin, store or channel source is ever configured
  - PRP artifact paths: every artifact of this phase except this plan lives under `PRPs/reports/qa-runner-ai-executable-steps/phase-9/` (git-ignored); run evidence lives under `PRPs/reports/<feature>/qa-run/<run-id>/` of each target
  - `npm run validate` keeps its 28 checks: no file under `scripts/validate/` changes
  - Frozen surfaces stay byte-identical: `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md`, `plugins/relay/commands/relay-qa-report.md`, `plugins/relay/scripts/visual/capture.mjs`
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/qa-runner-ai-executable-steps.prd.md` — Implementation Phases row 9: "Dogfood" — Goal: measure the hypothesis on the same two reports — Success signal: AC-26 read and reported, met or not, with every miss attributed to a named cause (PRD AC-26; counting convention AC-2; secrecy AC-21).

The counted runs are NOT executed by the implementer. This plan delivers the preparation the autonomous loop can do: the pre-run table re-frozen under the new convention (and its SHA-256) before any run, the adapted metrics, worksheet and post-run tooling with a self-check that proves each tool can fail, the operator-assisted runbook, and the report and close-decision skeletons. Everything that needs the operator (starting the praesto-sum dev server, applying the dedicated-role declaration, deciding the mail source, launching or approving the counted runs, reading every pass and judged step, deciding the close) is an explicit OPERATOR step in the runbook with the exact command and the check that proves it. Row 9 is closed by the operator's recorded decision against AC-26 with the metrics file as evidence (see `## Notes`); no acceptance criterion below claims that the counted runs happened or that the metrics hold.

## Summary

Adapt the phase-8 dogfood kit of `qa-runner-grounding-vocabulary-v2` (kept in the git-ignored `PRPs/reports/qa-runner-grounding-vocabulary-v2/phase-8/`) to relay 0.47.0 and the vocabulary-v3 convention, in a new git-ignored folder `PRPs/reports/qa-runner-ai-executable-steps/phase-9/`. Thirteen files are created (nine tools and documents plus the table's Markdown, JSON and SHA-256 line and the two skeletons, as listed in `## Files to Change`): a shared library whose reason classes are derived from the runner's own `REASON_CATALOGUE`; the pre-run table re-counted under the PRD AC-2 convention (impossible-class steps split out, judgment and channel steps counted, the metric denominator being every objective step not of impossible class) on the same two byte-identical reports, with its builder, derived JSON and SHA-256 line frozen before any run; `compute-metrics.mjs` (at least 90% of non-impossible objective steps per project and combined, catalogued codes and impossible claims matched to the table, at least 80% driver-executed over the automatable class, no false pass and every negative control failing, scans clean, zero manual preparation); `post-run-checks.mjs` and `pass-worksheet.mjs` extended to judged steps and extracted verification codes; `apply-dedicated-flag.mjs`, the operator's one-command, dry-run-first way to declare the dedicated roles that T-2 and S-6 need; `selfcheck.mjs`, which feeds every tool fabricated fixtures with seeded faults; the runbook; and the report and close-decision skeletons. No file of `plugins/relay/`, `scripts/validate/`, `documentation/` or `docs/` changes in this phase.

## User Story

As the operator of relay's human validation gate
I want the vocabulary-v3 runner measured on the same two reports against a table frozen before the run
So that I can decide, with evidence, whether `needs-human` now means only what no AI agent can execute alone

## Problem Statement

The Success signal of row 9 is a measurement the autonomous loop cannot perform alone: it needs a running local stack for each project, sessions minted for dedicated accounts, a command session that judges captures, and a person who reads every pass. The measurement is also only comparable to 0.46.0 if the reports are byte-identical and the reference table is re-counted under the new convention before the first run: the 0.46.0 table excluded human-by-nature and blocked cases from the coverage denominator and counted judgment and channel steps as human remainder, while PRD AC-2 puts every objective step not of impossible class into the denominator. The phase-8 kit encodes the old convention (a 70% target over two classes, a static code catalogue without classes, no judged or channel steps, the 0.46.0 runner path), so reusing it unchanged would measure the wrong thing.

## Solution Statement

One serial, autonomous pass that builds an adapted kit and proves it can fail, and a runbook that hands the rest to the operator. Order: shared library, then the frozen table (authored from the reports' own words, then built and frozen), then the metrics tool, the post-run checks, the worksheet, the dedicated-flag helper, the self-check, the runbook, the skeletons, and a final scope and regression fence. Each tool is copied from its phase-8 sibling and edited; the phase-8 files are never modified. Facts the plan was written against, to be re-verified by the tasks rather than trusted: relay 0.47.0 is merged and installed; the dogfood must run the INSTALLED copy of `qa-run.mjs` (OBS-3 of the previous dogfood showed `${CLAUDE_PLUGIN_ROOT}` resolving to the repository copy and Playwright 1.61.1 running instead of the provisioned version), so the runbook compares the two copies with `cmp` and records which Playwright version `preflight` resolves (the installed cache resolves 1.64.1; the repository corpus runs 1.61.1). Neither target declares `"dedicated": true` for any role in `PRPs/auth/login.config.json` today (checked for the `super-ensino` portal), so the write steps of T-2 and S-6 would end `blocked` `ROLE_NOT_DEDICATED` until the operator applies the declaration; neither target declares `channel_sources` (checked for the praesto-sum seed file; the `super-ensino` seed file is parsed by Task 2), so T-3 and S-3 are impossible-class in the table frozen here unless the operator adopts a local catcher before the freeze is relied on, in which case a dated addendum re-counts those two cases before any run. `read_message` is therefore not needed by any case in the default table; the runbook says so and keeps its control as N/A with the reason recorded.

## Metadata

| Key | Value |
|-----|-------|
| Type | dogfood tooling, operator-assisted measurement |
| Complexity | HIGH (nine new files adapted from a 3,000-line kit; one frozen table whose counts decide a metric; a self-check with seeded faults; an operator runbook for two projects) |
| Systems Affected | `PRPs/reports/qa-runner-ai-executable-steps/phase-9/` (git-ignored, new); read-only access to `C:/repos/super-ensino/portal` and the praesto-sum project (reports, `PRPs/auth/` declarations, `parse` mode only); no change to this repository's tracked files other than this plan and the source PRD row |
| Dependencies | `Depends` is `8` (`complete`): 0.47.0 merged as PR #47 (`e1844b6`) and installed; the phase-8 kit of `qa-runner-grounding-vocabulary-v2` (read-only); the two reference reports (byte-identical) |
| Estimated Tasks | 11 |
| Source PRD line ref | `PRPs/prds/qa-runner-ai-executable-steps.prd.md` lines 74-79 (metrics), 110 (AC-26), 86 (AC-2), 105 (AC-21), 213 (row 9), 257-260 (Phase 9 details), 276-277 (Decisions Log) |
| phase_type | feature |

`phase_type: feature` (the default): the deliverables are new executable tooling (`.mjs`), not documentation, configuration or a refactor, and no `## Files to Change` row is a documentation file in the repository. None of the files lives under any test glob (`scripts/validate/**/*.test.mjs`, `*.test.*`, `*.spec.*`, `test/`), so the test-pair deferral of Step 4.4.quater applies (see `## Notes`).

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `PRPs/prds/qa-runner-ai-executable-steps.prd.md` | 74-79, 86, 96-99, 105, 110, 257-260, 264-277 | The metrics, AC-2 (convention and re-freeze), AC-12 to AC-15 (dedicated, judge, mail), AC-21 (secrecy), AC-26 (the clause this phase reads), the Phase 9 scope and the Decisions Log |
| P0 | `plugins/relay/commands/relay-qa-run.md` | 640-752 | The frozen v2 classification, the reason-code catalogue with classes, the counting convention, the `class` and `objective_steps` fields and the two `needs_human_*` counters the table and the metrics are built against |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 2424-2522 | `REASON_CATALOGUE` (class per code) and `summarizeNeedsHuman`: the library derives its classes from this export and the metrics tool recomputes the counters with the same rule |
| P0 | `PRPs/reports/qa-runner-grounding-vocabulary-v2/phase-8/qa-run-runbook.md` | 1-432 | The runbook being adapted: ownership table, preconditions, procedure, post-run checks, reading rules, plan guide, negative controls, session briefs |
| P0 | `PRPs/reports/qa-runner-grounding-vocabulary-v2/phase-8/pre-run-table.md` | 1-113 | The frozen v2 table (counting convention CC-1 to CC-6, per-case counts, hashes, addenda rule) re-counted by Task 2 |
| P0 | `PRPs/reports/qa-runner-grounding-vocabulary-v2/phase-8/dogfood-lib.mjs` | 1-120 | `loadTable`, `isExecuted`, `stepStats`, `codeBucket`: the helpers Task 1 adapts |
| P0 | `PRPs/reports/qa-runner-grounding-vocabulary-v2/phase-8/compute-metrics.mjs` | 1-150 | `computeProject`, the integrity checks I1-I8, the coverage rule and the exit codes Task 4 adapts |
| P0 | `PRPs/reports/qa-runner-grounding-vocabulary-v2/phase-8/build-table-json.mjs` | 1-131 | The Markdown-to-JSON derivation and its `--check` mode that Task 3 adapts |
| P0 | `PRPs/reports/qa-runner-grounding-vocabulary-v2/phase-8/post-run-checks.mjs` | 1-70 | The check set C1-C9 and the secret collection that Task 5 extends |
| P0 | `PRPs/reports/qa-runner-grounding-vocabulary-v2/phase-8/pass-worksheet.mjs` | 1-60 | The reading worksheet that Task 6 extends to judged steps |
| P1 | `PRPs/reports/qa-runner-grounding-vocabulary-v2/phase-8/dogfood-report.md` | 1-140 | The result being compared against (27 of 74 steps, 36.5%) and the shape of the report Task 10 skeletons; findings KD-8 to KD-18 that explain which steps the new vocabulary targets |
| P1 | `C:/repos/super-ensino/portal/PRPs/auth/login.config.json` | 1-151 | Read-only: the three roles, their `mint` blocks, and the absence of any `dedicated` key that Task 7's helper and the runbook address |
| P1 | `C:/repos/super-ensino/portal/PRPs/auth/qa-seed.json` and `C:/repos/assistente-pessoal/PRPs/auth/qa-seed.json` | whole files | Read-only: the declared states, captures and query sources, and whether `channel_sources` is declared (Task 2 parses both) |
| P1 | `plugins/relay/commands/relay-qa-run.md` | 904-931, 1100-1125 | Channel sources and `read_message`; the judging protocol and `judged_by` (confirm the exact lines before citing them in the runbook) |
| P1 | `plugins/relay/scripts/qa-run.mjs` | 155-166, 1086, 5085-5104 | The usage text of every mode, the `StepRecord` type with `judged_by`/`judgment_evidence`, and the `results.json` top-level shape the metrics tool reads |

## Patterns to Mirror

```
# SOURCE: PRPs/reports/qa-runner-grounding-vocabulary-v2/phase-8/dogfood-lib.mjs:94-104
export function isExecuted(entry) {
  return isObj(entry) && (entry.outcome === 'pass' || entry.outcome === 'fail') && entry.reason_code !== RECORD_CODE;
}
export function stepStats(entry) {
  const steps = isObj(entry) && Array.isArray(entry.steps) ? entry.steps : [];
  const passed = steps.filter((s) => isObj(s) && s.result === 'passed').length;
  const failed = steps.filter((s) => isObj(s) && s.result === 'failed').length;
  return { passed, failed, executed: passed + failed, listed: steps.length };
}
```
Copied by Task 1 (the executed-step rule stays: a step is executed when its result is `passed` or `failed`; a judged step carries the same result values plus `judged_by`, so the same rule counts it; Task 1 adds a `judged` tally beside it).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:2508-2522
export function summarizeNeedsHuman(entries) {
  const total = { impossible: 0, gap: 0 };
  for (const e of entries) {
    if (!isObj(e) || e.outcome !== 'needs-human') continue;
    const cls = reasonClassOf(e.reason_code);
    if (cls === null) continue;
    ...
    total[cls] += owed;
  }
  return { needs_human_impossible: total.impossible, needs_human_gap: total.gap };
}
```
Copied by Task 4 (the metrics tool recomputes the two counters from the per-case entries with this exact rule and requires them to equal what `results.json` reports).

```
# SOURCE: PRPs/reports/qa-runner-grounding-vocabulary-v2/phase-8/build-table-json.mjs:44-61
export function derive() {
  const md = readFileSync(TABLE_MD, 'utf8');
  const mdSha = sha256File(TABLE_MD);
  /** @type {any[]} */ const cases = [];
  for (const line of section(md, '`super-ensino` (12 cases)')) {
    const m = /^\| ([XTAS]-\d) \| ([^|]+) \| (\d+) \|/.exec(line);
    if (!m) continue;
    ...
```
Copied by Task 3 (the table JSON is derived from the Markdown by row regex and cross-checked against sums the Markdown states in prose; v3 adds the impossible, judgment and channel columns and the denominator rule).

```
# SOURCE: PRPs/reports/qa-runner-grounding-vocabulary-v2/phase-8/compute-metrics.mjs:90-99
  // Coverage: capped at the frozen count per case (a plan that added steps must not buy coverage), and raw beside it.
  const covRows = rows.filter((r) => COVERAGE_CLASSES.includes(r.frozen_class));
  const covNum = covRows.reduce((n, r) => n + Math.min(r.steps_executed, r.frozen_steps), 0);
  const covNumPassed = covRows.reduce((n, r) => n + Math.min(r.steps_passed, r.frozen_steps), 0);
  const covRaw = covRows.reduce((n, r) => n + r.steps_executed, 0);
  const covDen = table.denominators[project];
```
Copied by Task 4 (the cap per case is kept; v3 caps at the case's frozen DENOMINATOR steps and reads every case, not two classes).

```
# SOURCE: PRPs/reports/qa-runner-grounding-vocabulary-v2/phase-8/pre-run-table.md:23-42
## Counting convention
An objective step is one action or one assertion that a machine can perform or verify with no human
judgment, counted at the grain of one plan step of the 0.46.0 vocabulary.
- **CC-1. One plan step, one count.** ...
- **CC-4. Human parts count 0.** An e-mail or SMS arrival, entering a code ..., a visual judgment ... are the human remainder.
- **CC-6. Only two classes feed the coverage metric.**
```
Copied by Task 2 (CC-1 to CC-3 and CC-5 are kept; CC-4 and CC-6 are replaced by the AC-2 rules below).

```
# SOURCE: plugins/relay/commands/relay-qa-run.md:718-728
Counting convention. Under this convention,
judgment and channel steps are objective steps, beside the driver steps: an
objective step is any step of a case that an AI agent can execute and judge alone,
so a step that needs a recorded judgment of a capture, or a message read from a
declared local source, is one. The metric denominator is
every objective step not of impossible class: a step leaves it only when its sole
reason to stay with a person is an impossible code, ...
```
Copied by Task 2 (the table's convention section quotes the rule and applies it per case).

```
# SOURCE: PRPs/reports/qa-runner-grounding-vocabulary-v2/phase-8/qa-run-runbook.md:214-220
Immediately after the run, **before any further mint, `ground` or negative control** (those can rotate the saved
sessions and the secrecy scan needs the tokens the run used):

node $P8/post-run-checks.mjs --project-root $SUPER --feature $SF --run-id <RUN_ID> --project super-ensino --accounts-module $SUPER/PRPs/auth/seeds/mint-session.mjs
```
Copied by Task 9 (the post-run ordering rule and the command shape; v3 points at the phase-9 folder and adds `--probe-env`).

```
# SOURCE: PRPs/reports/qa-runner-grounding-vocabulary-v2/phase-8/qa-run-runbook.md:374-380
1. `node "$PLUGIN/scripts/qa-run.mjs" init --root <project> --feature <feature>` (new `RUN_DIR`).
2. Write a `plan.json` with **one** entry: a copy of the passing case's entry with one expectation made wrong on purpose ...
3. `node "$PLUGIN/scripts/qa-run.mjs" run --root <project> --feature <feature> --run-dir <RUN_DIR>`.
4. The case must be `fail` with a reason naming the mismatch. If it is `pass`, the original assertion cannot fail ...
```
Copied by Task 9 (the negative-control procedure, extended to one control per new step kind and judgment kind).

```
# SOURCE: PRPs/plans/completed/qa-runner-ai-executable-steps-phase-8-release-cut.plan.md:279-282
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
node --input-type=module -e '
import fs from "node:fs";
```
Copied by Task 11 and every `**VALIDATE**` below (the block shape: `set -euo pipefail`, the fsmonitor prefix, an inline module script that accumulates a `bad` list and exits 1 when it is non-empty).

## Files to Change

All paths are under `PRPs/reports/qa-runner-ai-executable-steps/phase-9/` (git-ignored; written with absolute paths under `C:/repos/PRPs-agentic-eng/`).

| File | Action | Justification |
|------|--------|---------------|
| `dogfood-lib.mjs` | CREATE | Shared helpers; reason classes derived from the runner's `REASON_CATALOGUE`; targets 0.9 and 0.8; paths in this folder; installed 0.47.0 runner path |
| `pre-run-table.md` | CREATE | The pre-run table re-counted under AC-2 on the same two reports; frozen before any run |
| `build-table-json.mjs` | CREATE | Derives and checks `pre-run-table.json` from the Markdown |
| `pre-run-table.json` | CREATE | Machine-readable derivation consumed by the metrics tool (written by the builder, not by hand) |
| `pre-run-table.sha256` | CREATE | The freeze: SHA-256 of the Markdown and the UTC instant of the freeze |
| `compute-metrics.mjs` | CREATE | AC-26 metrics M1-M7, integrity checks, exit codes 0/1/2 |
| `post-run-checks.mjs` | CREATE | Report identity, freeze-before-run, secrecy and privacy scans extended to judged and channel artefacts |
| `pass-worksheet.mjs` | CREATE | Reading worksheet for every pass and every judged step |
| `apply-dedicated-flag.mjs` | CREATE | Operator-run, dry-run-first helper that declares the dedicated roles in a target's `login.config.json` |
| `selfcheck.mjs` | CREATE | Seeded-fault verification that each tool can fail (not a repository test; outside every test glob) |
| `qa-run-runbook.md` | CREATE | The operator-assisted procedure, the plan guide, the negative controls, the close protocol |
| `dogfood-report.skeleton.md` | CREATE | The report the operator fills after the runs, with a row per AC-26 clause |
| `close-decision.skeleton.md` | CREATE | The record by which the operator closes row 9 |

## NOT Building (Scope Limits)

- **The counted runs, any negative-control run, any `init`, `ground`, `run` or `judge` on a target, any mint, seed, write, container, database or dev-server start.** All of that is OPERATOR work in the runbook. The tasks below read the two reports, run `parse` (read-only) and write only under the phase-9 folder and, in fixtures, under the operating system's temporary directory.
- **Any change to `plugins/relay/`, `scripts/validate/`, `documentation/`, `docs/` or `package.json`.** A runner defect found while preparing is recorded in the runbook's findings list as a candidate `KD-n`, not fixed here. `npm run validate` keeps its 28 checks.
- **Any edit to a target project's files by the implementer.** `apply-dedicated-flag.mjs` is delivered and verified on a fabricated fixture only; the operator runs it on the real kit.
- **Any change to the reports, to `/relay-qa-report`, or to the phase-8 folder of the previous feature.** The metric depends on re-running byte-identical reports; the old kit is copied from, never edited.
- **Any non-local target, store, origin or channel source, and any health-family project.** The local-only guard stays on.
- **A claim that AC-26 is met.** The skeletons contain no result; the close decision is the operator's.
- **A credential, token, session value, extracted code, account value or username in any file written by this phase**, including this plan and the runbook (accounts are referred to as "the dedicated teacher account", "the dedicated student account").

## Step-by-Step Tasks

Tasks run in order. Every command runs from `C:/repos/PRPs-agentic-eng` in Windows Git Bash with `export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false`; Node paths are written `C:/...`. `P9` below means `C:/repos/PRPs-agentic-eng/PRPs/reports/qa-runner-ai-executable-steps/phase-9` and `P8` means `C:/repos/PRPs-agentic-eng/PRPs/reports/qa-runner-grounding-vocabulary-v2/phase-8`. Create `P9` with the first `Write`. Every file is LF-only and English-only. Each tool prints counts, names and verdict words, never a value.

### Task 1: CREATE dogfood-lib.mjs

- **ACTION**: Delivers AC-A2 (the shared rule the metrics rely on). `Read` `P8/dogfood-lib.mjs` in full, then `Write` `P9/dogfood-lib.mjs` as an adapted copy. Changes, nothing else: (1) `HERE`, `TABLE_JSON`, `TABLE_MD`, `TABLE_SHA` resolve in the phase-9 folder (they use `import.meta.url`, so a copy resolves itself); (2) `TARGET_COVERAGE = 0.9`, `TARGET_RATE = 0.8`; (3) delete the static `CATALOGUE` array and `COVERAGE_CLASSES`; add `import { REASON_CATALOGUE } from` the runner file `plugins/relay/scripts/qa-run.mjs` resolved from `HERE` (four directory levels up to the repository root, via `pathToFileURL`), and export `reasonClassOf(code)` returning the catalogue's `class` or `null` for anything that is not an own key (mirror `qa-run.mjs:2495-2498`); `codeBucket` uses `Object.hasOwn(REASON_CATALOGUE, code)` for `catalogued`; (4) `stepStats` gains `judged` (steps with `judged_by === "model"` whose result is `passed` or `failed`) beside `passed`, `failed`, `executed`, `listed`; (5) export `INSTALLED_RUNNER = "C:/Users/Fabio/.claude/plugins/cache/relay-marketplace/relay/0.47.0/scripts/qa-run.mjs"` and `IMPOSSIBLE_CODES` derived from the catalogue (the keys whose class is `impossible`); (6) keep every other export the other tools import (`DogfoodError`, `isObj`, `sha256File`, `sha256Text`, `readJson`, `loadTable`, `isExecuted`, `codeBucket`, `shannon`, `parseArgs`, `fwd`, `git`, `gitIgnored`, `isGitWorkTree`, `walkFiles`, `pngSize`, `RECORD_CODE`, `REDACTED`, `CLASSES`). Importing the runner must not execute a mode: if it does, read the catalogue by importing only after confirming the runner's entry guard, and stop with a note in the runbook findings rather than copying the codes.
- **MIRROR**: `# SOURCE: PRPs/reports/qa-runner-grounding-vocabulary-v2/phase-8/dogfood-lib.mjs:94-104`
- **VALIDATE**:

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
P9=C:/repos/PRPs-agentic-eng/PRPs/reports/qa-runner-ai-executable-steps/phase-9
node --check "$P9/dogfood-lib.mjs"
node --input-type=module -e '
import { pathToFileURL } from "node:url";
const lib = await import(pathToFileURL(process.argv[1] + "/dogfood-lib.mjs").href);
const run = await import(pathToFileURL("C:/repos/PRPs-agentic-eng/plugins/relay/scripts/qa-run.mjs").href);
const bad = [];
if (lib.TARGET_COVERAGE !== 0.9) bad.push("TARGET_COVERAGE is not 0.9");
if (lib.TARGET_RATE !== 0.8) bad.push("TARGET_RATE is not 0.8");
const keys = Object.keys(run.REASON_CATALOGUE);
if (keys.length < 10) bad.push("the runner catalogue looks truncated: " + keys.length);
for (const k of keys) if (lib.reasonClassOf(k) !== run.REASON_CATALOGUE[k].class) bad.push("class differs for " + k);
if (lib.reasonClassOf("NO_PLAN_ENTRY") !== null) bad.push("NO_PLAN_ENTRY must have no class");
if (lib.reasonClassOf("SESSION_UNAVAILABLE") !== null) bad.push("a runtime halt code must have no class");
if (lib.codeBucket("STEP_UNGROUNDED") !== "catalogued") bad.push("STEP_UNGROUNDED is not catalogued");
if (lib.codeBucket("SESSION_UNAVAILABLE") !== "outside-catalogue") bad.push("a halt code must be outside the catalogue");
if (lib.isExecuted({ outcome: "pass", reason_code: "AUTOMATED_EVIDENCE" }) !== false) bad.push("a record-resolved pass must not count as driver-executed");
const st = lib.stepStats({ steps: [{ result: "passed", judged_by: "model" }, { result: "failed" }, { result: "not-run" }, { result: "pending-judgment" }] });
if (st.executed !== 2 || st.judged !== 1 || st.listed !== 4) bad.push("stepStats wrong: " + JSON.stringify(st));
if (!lib.HERE.replace(/\\/g, "/").endsWith("qa-runner-ai-executable-steps/phase-9")) bad.push("HERE does not resolve to the phase-9 folder");
if (!String(lib.INSTALLED_RUNNER).includes("/relay/0.47.0/")) bad.push("INSTALLED_RUNNER does not name 0.47.0");
for (const n of ["IMPOSSIBLE_CODES"]) if (!Array.isArray(lib[n]) || lib[n].length !== 3) bad.push(n + " must hold the three impossible codes");
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
console.log("PASS: dogfood-lib derives its classes from the runner catalogue");
' "$P9"
```

### Task 2: CREATE pre-run-table.md

- **ACTION**: Delivers AC-A1. First `Read` the pre-run table `P8/pre-run-table.md` and the v2 dogfood report. Then, read-only: compute SHA-256 of the two reports and require them to equal the frozen values (`super-ensino`: `45f549d92ba4085b723ae9836fbac557fbcc2fa686ba74493be694c09835c071`, report `PRPs/reports/user-profile-in-the-portal-viewing-the-profile-page-and-editing-e-mail-and-phone-including-reset-of-the-inputs-on-close-and-changing-the-avatar-for-the-teacher-admin-and-student-roles/qa-report.md` under `C:/repos/super-ensino/portal`; `praesto-sum`: `c1808dd54c67df1704c1c4224edff8bbe5e7cb6663ca9a24c2e99120a1a92b6e`, report `PRPs/reports/missed-sweep/qa-report.md`). The praesto-sum project root is the directory whose report hashes to that value: the v2 dogfood used `C:/repos/assistente-pessoal`, whereas the hand-off for this phase named `C:/Users/Fabio/Documents/praesto-sum`, a directory that held only credential-named JSON files and no `PRPs/` when this plan was written (those files are not to be opened); record in the table the root actually used and, if no directory has a matching report hash, STOP and write nothing (the runbook's O-1 asks the operator for the root). Run the installed runner's read-only `parse --report <path>` on both reports (use `INSTALLED_RUNNER`; it contacts nothing) to read each case's manual steps. Parse both `PRPs/auth/qa-seed.json` files as JSON and record only the booleans "declares `channel_sources`" and, from each `login.config.json`, "any role declares `dedicated: true`" (booleans, no values). Then `Write` `P9/pre-run-table.md` with this structure and these literal headings and labels: title `# Phase 9 pre-run table: classes and objective-step counts under the vocabulary-v3 convention (FROZEN before the run)`; `## The two reports (byte identity)` (project, root used, report path, SHA-256, case count); `## Counting convention` quoting the AC-2 rule from `relay-qa-run.md:718-728` and defining CC-1 to CC-3 and CC-5 as in the v2 table plus: **CC-4.** A judgment step (a visual preview, a pt-BR reading, a UI/UX checklist the report states a criterion for) and a channel step (a message arrival, entering a code read from a declared local source) are objective steps; **CC-6.** A step is impossible-class only when its sole reason to stay with a person is an impossible code (`EXTERNAL_CHANNEL`, `OUTSIDE_LOCAL_ENVIRONMENT`, `HUMAN_SIGNOFF`) — with no declared local source for a channel, every step of a case that needs it is impossible, because starting the flow would send a real message; **CC-7.** The metric denominator is every objective step not impossible; a step no driver can express yet and no judgment can capture stays in the denominator as a named gap; **CC-8.** The case classes of the v2 table are copied unchanged and never re-derived (the four pre-run classes keep their meaning; the reason class belongs to a code, not a case); a line `Declared sources:` records the booleans read above; then one section per project (`## \`super-ensino\` (12 cases)` and `## \`praesto-sum\` (4 listed cases of 23)`) with a row per case in this exact column order: `| Case | Class | Objective steps | Impossible steps | Denominator steps | Judgment steps | Channel steps | Expected code if declined | Human remainder (impossible only) |`; `Class` uses the v2 labels `automatable`, `needs a new driver`, `human by nature`, `blocked by the product`; row ids are `X-1 T-1 T-2 T-3 A-1 A-2 S-1 S-2 S-3 S-4 S-5 S-6` and for praesto-sum `20 (AC-20)`, `21 (OUT-1)`, `22 (G-1)`, `23 (G-2)` (cases 1 to 19 are record-resolved with 0 objective steps and are stated in a note line, not rows); `Objective steps` = `Impossible steps` + `Denominator steps` on every row. Class per case is the v2 class (X-1 blocked by the product; T-1 and A-1 and case 23 automatable; T-2 A-2 S-1 S-2 S-4 S-6 and case 20 needs a new driver; T-3 S-3 S-5 human by nature; case 21 human by nature; case 22 needs a new driver). Counts: start from the v2 counts, add the judgment and channel steps the v2 table put in its human remainder (S-5's preview judgment, case 20's pt-BR reading and UI/UX checklist when the report states a criterion for them, T-3's and S-3's message arrival, code entry and result), and for T-3 and S-3 (no declared local source) mark ALL of their steps impossible with `EXTERNAL_CHANNEL`; case 21 steps impossible with `OUTSIDE_LOCAL_ENVIRONMENT`; X-1 stays in the denominator (a defect the case can reach is executed). Every judgment step carries, in a final per-project list `Judgment criteria`, the criterion text copied verbatim from the report; if the report states no criterion for a judgment the step is NOT a judgment step: it stays a denominator step with expected code `VISUAL_JUDGEMENT` and is named in the list as "no criterion in the report". Finish with `## Totals and thresholds` (per project and combined: denominator, and the 90% threshold as a step count, `ceil(0.9 x denominator)`), `## What the counts say about risk` (which cases carry the denominator, which findings KD-8 to KD-17 each targets), `## Frozen` (a line `Frozen: <UTC ISO instant>`) and `## Addenda` containing exactly `None yet. A correction is appended here with its date and reason, and the SHA-256 is recomputed in a new line of pre-run-table.sha256; the lines above are never edited.` Do not write the SHA-256 or the freeze instant yet (Task 3 does); write `Frozen: pending Task 3` as a placeholder that Task 3 replaces ONCE, before hashing. No account name, credential, token or personal value appears anywhere.
- **MIRROR**: `# SOURCE: PRPs/reports/qa-runner-grounding-vocabulary-v2/phase-8/pre-run-table.md:23-42` and `# SOURCE: plugins/relay/commands/relay-qa-run.md:718-728`
- **VALIDATE**:

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
P9=C:/repos/PRPs-agentic-eng/PRPs/reports/qa-runner-ai-executable-steps/phase-9
node --input-type=module -e '
import fs from "node:fs";
import crypto from "node:crypto";
const dir = process.argv[1];
const md = fs.readFileSync(dir + "/pre-run-table.md", "utf8");
const bad = [];
const V2 = { "X-1": "blocked by the product", "T-1": "automatable", "T-2": "needs a new driver", "T-3": "human by nature", "A-1": "automatable", "A-2": "needs a new driver", "S-1": "needs a new driver", "S-2": "needs a new driver", "S-3": "human by nature", "S-4": "needs a new driver", "S-5": "human by nature", "S-6": "needs a new driver", "20": "needs a new driver", "21": "human by nature", "22": "needs a new driver", "23": "automatable" };
const rows = new Map();
for (const l of md.split("\n")) {
  const m = /^\| ([XTAS]-\d|\d+ \([A-Z]+-\d+\)) \| ([^|]+) \| (\d+) \| (\d+) \| (\d+) \| (\d+) \| (\d+) \| ([^|]*) \| ([^|]*) \|/.exec(l);
  if (!m) continue;
  const id = m[1].replace(/ \(.*$/, "");
  rows.set(id, { cls: m[2].trim(), obj: +m[3], imp: +m[4], den: +m[5], judge: +m[6], chan: +m[7], code: m[8].trim() });
}
for (const [id, cls] of Object.entries(V2)) {
  const r = rows.get(id);
  if (!r) { bad.push("missing row " + id); continue; }
  if (r.cls !== cls) bad.push("class of " + id + " differs from the frozen v2 class: " + r.cls);
  if (r.obj !== r.imp + r.den) bad.push("objective != impossible + denominator on " + id);
  if (r.judge + r.chan > r.obj) bad.push("judgment + channel exceed the objective steps on " + id);
}
if (rows.size !== 16) bad.push("expected 16 case rows, found " + rows.size);
for (const id of ["T-3", "S-3"]) { const r = rows.get(id); if (r && (r.imp !== r.obj || r.den !== 0)) bad.push(id + " must be wholly impossible while no local channel source is declared"); }
const x1 = rows.get("X-1"); if (x1 && (x1.imp !== 0 || x1.den !== x1.obj)) bad.push("X-1 must stay wholly in the denominator");
const c22 = rows.get("22"); if (c22 && c22.obj !== 0) bad.push("case 22 has no manual procedure: 0 objective steps");
for (const s of ["## The two reports (byte identity)", "## Counting convention", "## Totals and thresholds", "## What the counts say about risk", "## Frozen", "## Addenda", "Declared sources:", "**CC-7.**", "**CC-8.**", "Judgment criteria"]) if (!md.includes(s)) bad.push("missing: " + s);
if (!md.includes("45f549d92ba4085b723ae9836fbac557fbcc2fa686ba74493be694c09835c071")) bad.push("super-ensino report hash missing");
if (!md.includes("c1808dd54c67df1704c1c4224edff8bbe5e7cb6663ca9a24c2e99120a1a92b6e")) bad.push("praesto-sum report hash missing");
const sha = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const SUPER = "C:/repos/super-ensino/portal/PRPs/reports/user-profile-in-the-portal-viewing-the-profile-page-and-editing-e-mail-and-phone-including-reset-of-the-inputs-on-close-and-changing-the-avatar-for-the-teacher-admin-and-student-roles/qa-report.md";
if (sha(SUPER) !== "45f549d92ba4085b723ae9836fbac557fbcc2fa686ba74493be694c09835c071") bad.push("the super-ensino report on disk is not the frozen one");
if (/Bearer [A-Za-z0-9._-]{12,}|eyJ[A-Za-z0-9_-]{10,}\.|"(?:username|password|email|cellphone|token)"\s*:\s*"[^"]+"/.test(md)) bad.push("a credential-shaped or account-shaped string is present");
if (/\r/.test(md)) bad.push("CR found: LF only");
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
console.log("PASS: the pre-run table has 16 consistent rows with the frozen v2 classes");
' "$P9"
```

### Task 3: CREATE build-table-json.mjs, pre-run-table.json and pre-run-table.sha256 (the freeze)

- **ACTION**: Delivers AC-A1. `Read` `P8/build-table-json.mjs`; `Write` `P9/build-table-json.mjs` as an adapted copy: `CLASS_BY_LABEL` unchanged; both project sections parsed with the nine-column row regex of Task 2 (`SUPER_INDEX` unchanged for the `super-ensino` ids; praesto-sum ids map `20 21 22 23` to their own numbers); each case object carries `project`, `index`, `id`, `title_prefix`, `class`, `objective_steps`, `impossible_steps`, `denominator_steps`, `judgment_steps`, `channel_steps`, `expected_code`; the prose cross-check of v2 (hard-coded class sums) is replaced by a cross-check that, per project, the sum of `denominator_steps` equals the `Denominator` figure printed in `## Totals and thresholds`; `denominators` is the per-project and combined sum of `denominator_steps`; `thresholds_steps` is `ceil(0.9 x denominator - 1e-9)` per project and combined; `automatable` lists the ids of the automatable cases; `targets` is `{ automatable_driver_executed_rate: 0.8, executed_share_of_denominator: 0.9 }`; the report hashes are read from the Markdown as in v2; `--check` mode as in v2. Then perform the freeze in this order, once: (a) replace the placeholder `Frozen: pending Task 3` in `pre-run-table.md` with `Frozen: <current UTC ISO instant>`; (b) run `node P9/build-table-json.mjs` to write `pre-run-table.json`; (c) write `P9/pre-run-table.sha256` with two lines: `<sha256 of pre-run-table.md>  pre-run-table.md` and `Frozen: <the same instant>`; (d) from here on `pre-run-table.md` is never edited (a later correction is a dated addendum, a new hash line, and a rebuilt JSON). No `/relay-qa-run` run directory of either project may be newer than the freeze instant (none exists when this task runs; the post-run checks enforce the order for the real runs).
- **MIRROR**: `# SOURCE: PRPs/reports/qa-runner-grounding-vocabulary-v2/phase-8/build-table-json.mjs:44-61`
- **VALIDATE**:

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
P9=C:/repos/PRPs-agentic-eng/PRPs/reports/qa-runner-ai-executable-steps/phase-9
node --check "$P9/build-table-json.mjs"
node "$P9/build-table-json.mjs" --check
node --input-type=module -e '
import fs from "node:fs";
import crypto from "node:crypto";
const dir = process.argv[1];
const md = fs.readFileSync(dir + "/pre-run-table.md");
const t = JSON.parse(fs.readFileSync(dir + "/pre-run-table.json", "utf8"));
const shaLines = fs.readFileSync(dir + "/pre-run-table.sha256", "utf8").split("\n").filter(Boolean);
const bad = [];
const h = crypto.createHash("sha256").update(md).digest("hex");
if (!shaLines[0] || shaLines[0].slice(0, 64) !== h) bad.push("the recorded SHA-256 is not the table's");
if (t.derived_from_sha256 !== h) bad.push("the JSON was derived from another version of the table");
if (/pending Task 3/.test(md.toString())) bad.push("the freeze placeholder is still present");
const frozen = (shaLines.find((l) => l.startsWith("Frozen: ")) || "").slice(8);
if (!frozen || Number.isNaN(Date.parse(frozen))) bad.push("no valid Frozen instant in the sha256 file");
if (!md.toString().includes("Frozen: " + frozen)) bad.push("the Markdown and the sha256 file disagree on the freeze instant");
const den = (p) => t.cases.filter((c) => c.project === p).reduce((n, c) => n + c.denominator_steps, 0);
if (t.denominators["super-ensino"] !== den("super-ensino") || t.denominators["praesto-sum"] !== den("praesto-sum")) bad.push("denominators do not equal the sum of the case denominators");
if (t.denominators.combined !== den("super-ensino") + den("praesto-sum")) bad.push("the combined denominator is wrong");
for (const k of ["super-ensino", "praesto-sum", "combined"]) if (t.thresholds_steps[k] !== Math.ceil(0.9 * t.denominators[k] - 1e-9)) bad.push("threshold wrong for " + k);
for (const c of t.cases) if (c.objective_steps !== c.impossible_steps + c.denominator_steps) bad.push("case sums wrong: " + c.id);
if (t.cases.length !== 16) bad.push("expected 16 cases, found " + t.cases.length);
if (!t.automatable.includes("T-1") || !t.automatable.includes("A-1") || !t.automatable.includes("G-2")) bad.push("the automatable cases are T-1, A-1 and G-2 (case 23)");
if (t.targets.executed_share_of_denominator !== 0.9) bad.push("target 0.9 missing");
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
console.log("PASS: the table is frozen, hashed and its derived thresholds recompute");
' "$P9"
```

### Task 4: CREATE compute-metrics.mjs

- **ACTION**: Delivers AC-A2. `Read` `P8/compute-metrics.mjs` in full and `Write` `P9/compute-metrics.mjs` as an adapted copy that keeps its CLI (`--super <results.json> --praesto <results.json> [--worksheet <file>]... [--json]`) and exit codes (0 every automatic target met and no integrity problem; 1 a target not met or a reading still open; 2 integrity problem or bad usage) and adds `--controls <file>`, `--post-run <file>`... (repeatable) and `--prep-log <file>`. Integrity checks I1-I8 are kept, with I7 changed to require the 0.47.0 shape (`classification` block, per-case `class`, and the top-level `needs_human_impossible` and `needs_human_gap` integers) and two added: I9 every step carrying `judged_by` also carries a non-empty `judgment_evidence` string (a judged step without cited evidence is an integrity problem), I10 the runner's `needs_human_impossible` and `needs_human_gap` equal the totals recomputed from the case entries with the `summarizeNeedsHuman` rule (copy its logic; do not import it, so that a drift in the runner is detected). Targets, named M1 to M7 so the report can cite them: **M1** every table case carries its frozen class; **M2** driver-executed rate over the table's automatable cases at least 0.8 (unchanged definition: `pass` or `fail` produced by a driver, never `AUTOMATED_EVIDENCE`; a partial case never counts); **M3a/M3b** executed share of the denominator at least 0.9 in each project and combined, numerator per case = `min(stepStats.executed, denominator_steps)` over ALL table cases (a judged `passed` or `failed` step counts as executed; `pending-judgment`, `uncertain` and `human` steps do not), raw numerator printed beside it, thresholds from the JSON; **M4** every non-executed case carries a catalogued code (not `NO_PLAN_ENTRY`, not outside the catalogue), AND every case whose reason code is of the impossible class has `impossible_steps > 0` in the table, AND every table case with `impossible_steps > 0` is `needs-human` with an impossible code (a mismatch in either direction is "not met" and names the case); **M5** every case with a pass or a passed step (judged steps included) has a `TRUE PASS` verdict in the completed worksheets (`OPEN` when none are given), AND the `--controls` file (an array of `{ id, kind, expected_outcome, observed_outcome }`) has every `observed_outcome` equal to its `expected_outcome` with none `pass` where the expectation is not `pass`, AND covers every kind in the table's list of control kinds recorded in the runbook (read from the `--controls` file's own `required_kinds` array; absent file is `OPEN`); **M6** every `--post-run` JSON file (the `--json` output of `post-run-checks.mjs`) has no FAIL (absent is `OPEN`); **M7** the `--prep-log` file (an array of `{ step, category, note }`, category one of `plugin`, `kit`, `environment`, `project-declaration`) has zero entries of category `plugin` or `kit` (absent is `OPEN`). A case with outcome `fail` produced by a driver is executed (a defect found is a result, not a miss). The output states which reading (per project and combined) each target used and prints no value.
- **MIRROR**: `# SOURCE: PRPs/reports/qa-runner-grounding-vocabulary-v2/phase-8/compute-metrics.mjs:90-99` and `# SOURCE: plugins/relay/scripts/qa-run.mjs:2508-2522`
- **VALIDATE**:

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
P9=C:/repos/PRPs-agentic-eng/PRPs/reports/qa-runner-ai-executable-steps/phase-9
node --check "$P9/compute-metrics.mjs"
node --input-type=module -e '
import { pathToFileURL } from "node:url";
import fs from "node:fs";
const dir = process.argv[1];
const m = await import(pathToFileURL(dir + "/compute-metrics.mjs").href);
const t = JSON.parse(fs.readFileSync(dir + "/pre-run-table.json", "utf8"));
const bad = [];
if (typeof m.computeProject !== "function") bad.push("computeProject is not exported");
// A fabricated results object in which every table case ran every denominator step: the share must be 1.
const mk = (project) => {
  const ref = t.reports[project];
  const cases = t.cases.filter((c) => c.project === project).map((c) => ({
    index: c.index, title: c.title_prefix + " x", class: c.class, objective_steps: c.objective_steps, outcome: "pass", reason_code: null, driver: "browser",
    steps: Array.from({ length: c.denominator_steps }, (_, i) => ({ index: i, action: "x", result: "passed", evidence: null })),
  }));
  return { schema_version: 1, run_id: "x", aborted: null, human_gate: { status: "open" }, report_sha256_before: ref.sha256, report_sha256_after: ref.sha256, counts: { pass: cases.length, fail: 0, blocked: 0, "needs-human": 0 }, cases, classification: {}, needs_human_impossible: 0, needs_human_gap: 0 };
};
const ok = m.computeProject("super-ensino", mk("super-ensino"), t);
if (ok.coverage.rate !== 1) bad.push("a fully executed fabricated run must read 1, got " + ok.coverage.rate);
const half = mk("super-ensino");
for (const c of half.cases) c.steps = c.steps.slice(0, Math.floor(c.steps.length / 2));
const lo = m.computeProject("super-ensino", half, t);
if (!(lo.coverage.rate < 0.9)) bad.push("a half-executed fabricated run must read below 0.9, got " + lo.coverage.rate);
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
console.log("PASS: compute-metrics reads a full run as 1 and a half run below the 0.9 target");
' "$P9"
```

### Task 5: CREATE post-run-checks.mjs

- **ACTION**: Delivers AC-A3. `Read` `P8/post-run-checks.mjs` in full and `Write` `P9/post-run-checks.mjs` as an adapted copy that keeps checks C1-C9 and their CLI (`--project-root --feature --run-id --project [--accounts-module] [--sessions-dir] [--table]`), imports from this folder's library, and adds: **C0** the table was frozen before the run: the `Frozen:` instant of `pre-run-table.sha256` is earlier than the run id's instant (`YYYYMMDDTHHMMSSmmmZ`) of the run being checked (FAIL otherwise; the same check refuses an empty or malformed id); **C6b** repeatable `--probe-env <NAME>`: the value of each named environment variable (an extracted verification code, a token, whatever the operator exports for the purpose) is read from `process.env`, never printed, and searched in every file of the run directory, ignored files included; any hit is FAIL naming only the variable NAME and the file name; an unset variable is `WARN` naming the variable; **C4e** message- and capture-derived files stay inside the ignored evidence directory: any file in the run directory outside `evidence/` and outside the known run-level files (`plan.json`, `results.json`, `.gitignore`, the grounding folder the v2 check already knows, `worksheet.md`) with an image or message-shaped name (`*.png`, `*.txt`, names containing `message`, `mail`, `sms`, `code`) is FAIL; **C10** a `judged` step in `results.json` (any step with `judged_by`) names an existing capture file inside the run directory and that file is ignored by git (or, where the project ignores all of `PRPs/`, is inside `evidence/`). Add `--json` printing `{ checks: [{ id, status, detail }] }` for `compute-metrics --post-run`. The default runner constant, if any, is `INSTALLED_RUNNER` from the library. Output remains pass/fail words, counts, file names and the NAME of a source; never a value. Keep the phase-8 bad-usage behaviour byte-for-byte: a usage error writes a line beginning `POSTRUN_USAGE` to stderr and exits 2 (the Task 5 VALIDATE asserts exactly that).
- **MIRROR**: `# SOURCE: PRPs/reports/qa-runner-grounding-vocabulary-v2/phase-8/qa-run-runbook.md:214-220`
- **VALIDATE**:

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
P9=C:/repos/PRPs-agentic-eng/PRPs/reports/qa-runner-ai-executable-steps/phase-9
node --check "$P9/post-run-checks.mjs"
node --input-type=module -e '
import fs from "node:fs";
const src = fs.readFileSync(process.argv[1] + "/post-run-checks.mjs", "utf8");
const bad = [];
for (const s of ["C0", "C6b", "C4e", "C10", "--probe-env", "--json"]) if (!src.includes(s)) bad.push("post-run-checks lacks " + s);
if (/console\.log\([^)]*process\.env\[/.test(src)) bad.push("an environment value may be printed");
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
console.log("PASS: post-run-checks carries the v3 checks (behaviour is proven by selfcheck.mjs, Task 8)");
' "$P9"
ERR=$(mktemp)
set +e
node "$P9/post-run-checks.mjs" >/dev/null 2>"$ERR"
RC=$?
set -e
if [ "$RC" -ne 2 ]; then echo "FAIL: running without arguments must exit 2 (bad usage), got $RC"; rm -f "$ERR"; exit 1; fi
grep -qF -- "POSTRUN_USAGE" "$ERR" || { echo "FAIL: the usage line must carry POSTRUN_USAGE on stderr"; rm -f "$ERR"; exit 1; }
rm -f "$ERR"
echo "PASS: bad usage exits 2 with POSTRUN_USAGE on stderr"
```

### Task 6: CREATE pass-worksheet.mjs

- **ACTION**: Delivers AC-A4. `Read` `P8/pass-worksheet.mjs` in full and `Write` `P9/pass-worksheet.mjs` as an adapted copy: the default runner is `INSTALLED_RUNNER`; every case with a `pass`, a passed step or a judged step is rendered; for a judged step (a step with `judged_by`) the worksheet prints the step kind (`visual`, `language`, `checklist`), the criterion exactly as the plan states it, the report's manual steps beside it, whether the criterion appears in the report's manual steps (whitespace-collapsed), the recorded verdict word, the length of `judgment_evidence` and the evidence text itself, the capture file name and its PNG dimensions, and for a scoped judge step the element capture's name and dimensions; flags `FP-JUDGE-UNCITED` (evidence shorter than 30 characters or identical to the criterion), `FP-JUDGE-NO-SCOPE-CAPTURE` (a scoped judge step with no element capture), `FP-JUDGE-FULLPAGE-MISSING` (the case's final capture is not larger than the default viewport when the page is longer, using the dimensions only) and keeps the v2 flags; each judged step gets the same six boxes plus "Would the capture have contradicted the verdict?" and a verdict line starting `UNREAD`. The worksheet never prints a typed `fill` value, a body or an account value; the judge evidence text is the session's own description and is printed only into the worksheet file, which the runbook keeps inside the ignored run directory.
- **MIRROR**: `# SOURCE: PRPs/reports/qa-runner-grounding-vocabulary-v2/phase-8/pass-worksheet.mjs:31` (`const DEFAULT_RUNNER = 'C:/Users/Fabio/.claude/plugins/cache/relay-marketplace/relay/0.46.0/scripts/qa-run.mjs';`)
- **VALIDATE**:

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
P9=C:/repos/PRPs-agentic-eng/PRPs/reports/qa-runner-ai-executable-steps/phase-9
node --check "$P9/pass-worksheet.mjs"
node --input-type=module -e '
import fs from "node:fs";
const src = fs.readFileSync(process.argv[1] + "/pass-worksheet.mjs", "utf8");
const bad = [];
for (const s of ["FP-JUDGE-UNCITED", "FP-JUDGE-NO-SCOPE-CAPTURE", "FP-JUDGE-FULLPAGE-MISSING", "judged_by", "judgment_evidence", "UNREAD"]) if (!src.includes(s)) bad.push("pass-worksheet lacks " + s);
if (src.includes("/relay/0.46.0/")) bad.push("the 0.46.0 runner path is still present");
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
console.log("PASS: pass-worksheet reads judged steps (rendering is proven by selfcheck.mjs, Task 8)");
' "$P9"
```

### Task 7: CREATE apply-dedicated-flag.mjs

- **ACTION**: Delivers AC-A5. `Write` `P9/apply-dedicated-flag.mjs`: `node apply-dedicated-flag.mjs --root <project> --roles <a,b> [--apply]`. It reads `<root>/PRPs/auth/login.config.json`, refuses (exit 2) when the file is absent, is not valid JSON, has no `roles` object or a requested role is not a key of `roles`, and otherwise reports for each requested role whether `dedicated` is already `true`. Without `--apply` it writes nothing and prints `DRY-RUN` (to stdout) with the roles it would set. A file that is not in canonical form is refused with exit 2 and a message on stderr, in dry-run as well as with `--apply`. With `--apply` it sets `roles.<name>.dedicated = true` for the requested roles only, preserves every other byte-significant property (key order, two-space indentation, a trailing newline) by re-serializing with `JSON.stringify(doc, null, 2) + "\n"` only when the original file already used that exact serialization (otherwise it refuses with a message and writes nothing), writes through a temporary file and a rename, and is idempotent. It prints role names and `set`/`already` words only, never any other value, and refuses a root that is not under a local drive path (no URL). The implementer runs it only against fabricated fixtures (Task 8); the real run is runbook step O-4, always dry-run first. The flag marks the dedicated QA account roles that T-2 (save the occupation) and S-6 (save the avatar) write with; it is a project declaration, listed in the preparation log under `project-declaration` and never counted as plugin or kit preparation.
- **MIRROR**: `# SOURCE: PRPs/reports/qa-runner-grounding-vocabulary-v2/phase-8/post-run-checks.mjs:1-13` (read-only tooling that prints words and counts, exit 0/1/2, never a value)
- **VALIDATE**:

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
P9=C:/repos/PRPs-agentic-eng/PRPs/reports/qa-runner-ai-executable-steps/phase-9
node --check "$P9/apply-dedicated-flag.mjs"
TMP=$(mktemp -d)
mkdir -p "$TMP/PRPs/auth" "$TMP/neg/PRPs/auth"
# Canonical fixture: written exactly as JSON.stringify(doc, null, 2) + newline, the only form the helper accepts.
node --input-type=module -e '
import fs from "node:fs";
const doc = { baseUrl: "http://localhost:1", roles: { a: { mechanism: "minted" }, b: { mechanism: "minted" } } };
fs.writeFileSync(process.argv[1] + "/PRPs/auth/login.config.json", JSON.stringify(doc, null, 2) + "\n");
' "$TMP"
# Negative fixture: valid JSON in a hand-formatted (non-canonical) form; the helper must refuse and write nothing.
printf '{\n  "baseUrl": "http://localhost:1",\n  "roles": {\n    "a": { "mechanism": "minted" }\n  }\n}\n' > "$TMP/neg/PRPs/auth/login.config.json"
cp "$TMP/neg/PRPs/auth/login.config.json" "$TMP/neg-before.json"
if node "$P9/apply-dedicated-flag.mjs" --root "$TMP/neg" --roles a --apply; then echo "FAIL: a non-canonical file must be refused"; exit 1; else echo "PASS: non-canonical file refused"; fi
cmp "$TMP/neg-before.json" "$TMP/neg/PRPs/auth/login.config.json"
cp "$TMP/PRPs/auth/login.config.json" "$TMP/before.json"
node "$P9/apply-dedicated-flag.mjs" --root "$TMP" --roles a | grep -q "DRY-RUN"
cmp "$TMP/before.json" "$TMP/PRPs/auth/login.config.json"
node "$P9/apply-dedicated-flag.mjs" --root "$TMP" --roles a --apply
node --input-type=module -e '
import fs from "node:fs";
const d = JSON.parse(fs.readFileSync(process.argv[1] + "/PRPs/auth/login.config.json", "utf8"));
if (d.roles.a.dedicated !== true) { console.error("role a not set"); process.exit(1); }
if ("dedicated" in d.roles.b) { console.error("role b was touched"); process.exit(1); }
console.log("PASS: dry run wrote nothing; apply set only the requested role");
' "$TMP"
if node "$P9/apply-dedicated-flag.mjs" --root "$TMP" --roles nope --apply; then echo "FAIL: an unknown role must be refused"; exit 1; else echo "PASS: unknown role refused"; fi
rm -rf "$TMP"
```

### Task 8: CREATE selfcheck.mjs

- **ACTION**: Delivers AC-A6. `Write` `P9/selfcheck.mjs` (a plain Node script, `node selfcheck.mjs`; not a `node:test` file, no `.test.`/`.spec.` in its name, kept outside every repository test glob). It builds fabricated fixtures in `os.tmpdir()` only (a fabricated frozen table copy, results objects, a fake run directory with `plan.json`, `results.json`, `evidence/` and a `.gitignore`, a tiny fake git work tree, fake `login.config.json`), runs each tool of the folder as a child process or through its exports, and asserts BOTH directions for each: the passing fixture is accepted and every seeded fault is rejected with the right exit code. At least these 28 checks: library (class derivation matches the runner catalogue; an unknown code has no class); table (a wrong sum is rejected by the builder; a `--check` against an edited Markdown fails; `loadTable` refuses a Markdown whose hash differs from the recorded one); metrics (a full fabricated run exits 0 with every target met; coverage at 89% of a denominator reads M3 not met; a case with an impossible reason code absent from the table's impossible steps reads M4 not met; a table case with impossible steps that the run executed reads M4 not met; a results file without the two `needs_human_*` counters is an integrity problem exit 2; counters that differ from the recomputation exit 2; a judged step without `judgment_evidence` exits 2; a changed report hash exits 2; a worksheet verdict `FALSE PASS` reads M5 not met; a control observed `pass` where `fail` was expected reads M5 not met; a control set missing a required kind reads M5 `OPEN`; a prep log with a `plugin` entry reads M7 not met and one with only `environment` and `project-declaration` entries reads M7 met); post-run (a leaked probe value in a visible file is FAIL and its value never appears in the tool's output; a message-shaped file outside `evidence/` is FAIL; a masked URL host is FAIL; a run id earlier than the freeze instant is FAIL; a judged step naming a missing capture is FAIL; the clean fixture passes); worksheet (renders a judged step with its criterion and evidence length and flags `FP-JUDGE-UNCITED` for a one-word evidence); dedicated flag (dry-run writes nothing, apply sets only the requested roles, idempotent, unknown role refused). It prints `PASS <n> of <n>` and exits 0 only when every check holds and `n >= 28`; any failure prints the check name and exits 1. A `SELFCHECK_BREAK=1` environment variable makes it corrupt one fixture on purpose so the run must fail (the proof that the script can fail). It prints no value from any real project and never touches a target project.
- **MIRROR**: `# SOURCE: PRPs/plans/completed/qa-runner-ai-executable-steps-phase-8-release-cut.plan.md:279-282` (the `bad` list and `process.exit(1)` shape) and `# SOURCE: PRPs/reports/qa-runner-grounding-vocabulary-v2/phase-8/compute-metrics.mjs:1-12` (exit codes 0/1/2)
- **VALIDATE**:

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
P9=C:/repos/PRPs-agentic-eng/PRPs/reports/qa-runner-ai-executable-steps/phase-9
node --check "$P9/selfcheck.mjs"
node "$P9/selfcheck.mjs"
if SELFCHECK_BREAK=1 node "$P9/selfcheck.mjs"; then
  echo "FAIL: the self-check passed with a deliberately broken fixture"; exit 1
else
  echo "PASS: the self-check fails when a fixture is broken"
fi
node --input-type=module -e '
import fs from "node:fs";
const src = fs.readFileSync(process.argv[1] + "/selfcheck.mjs", "utf8");
const n = (src.match(/\bcheck\(/g) || []).length;
if (n < 28) { console.error("selfcheck defines only " + n + " check( calls"); process.exit(1); }
console.log("PASS: selfcheck defines " + n + " checks");
' "$P9"
```

### Task 9: CREATE qa-run-runbook.md

- **ACTION**: Delivers AC-A7. `Read` `P8/qa-run-runbook.md` in full; `Write` `P9/qa-run-runbook.md` as its v3 adaptation. It MUST contain, byte-exact, the sentence `The counted runs are NOT executed by the implementer.` in its opening status paragraph and the headings `## 1. Read this first`, `## 2. Ownership`, `## 3. Preconditions`, `## 4. The procedure`, `## 5. Reading every pass against its evidence`, `## 6. The plan guide`, `## 7. Negative controls`, `## 8. Session briefs`, `## 9. Closing row 9`, `## 10. What is verified and what is not`. Required content: **Section 1** — the facts re-verified at the start of the phase (0.47.0 installed; `preflight` ok on both targets; the praesto-sum root question and the root used; Playwright 1.64.1 resolved from the cache against 1.61.1 in the repository corpus, to be recorded from `preflight` and the first `run` and watched as a risk; neither target declaring `dedicated` or `channel_sources` at planning time), the decisions with a recommended answer (D-A mail catcher: default NOT adopted, T-3 and S-3 impossible as frozen, adoption only before any run and only with a dated table addendum; D-B apply the dedicated declaration for the teacher and student roles; D-C the counted run is the first full run of a project, a second only after a recorded environment failure; D-D both the per-project and the combined reading must hold; D-E judgments are recorded by the command session of the counted run and re-read by a separate reading session; D-F a plan step the report does not describe, such as S-4's submit, is allowed only with the invalid literal that cannot send anything and is otherwise left as a named gap). **Section 2** — a table whose operator rows are exactly `| O-1 |` to `| O-12 |`, each with the exact command (or action) and the check that proves it, in this order: O-1 confirm the praesto-sum root (report hash); O-2 start the praesto-sum dev server (`npm run dev` in that root) and prove it with a status-code-only `curl`; O-3 provide the owner token only through the git-ignored credentials file or the environment of the run session (never typed in chat), proven by presence not content; O-4 decide D-A and apply the dedicated declaration with `apply-dedicated-flag.mjs` (dry-run first, then `--apply`), proven by re-running dry-run and reading `already`; O-5 confirm the `super-ensino` stack and the dedicated accounts (status codes; the kit's own mint is exercised by the first `ground`); O-6 run the installed-copy parity and `preflight` for both targets from the installed runner (`cmp` of the installed and repository `qa-run.mjs`; `preflight --root <dir>` exit 0); O-7 launch (or approve the launch of) one fresh command session per project and paste the brief; O-8 approve any prefix `ground` click and refuse any Save, submit or delete; O-9 run, or approve running, the post-run checks immediately after each run and before any further mint or control; O-10 read every worksheet and settle disputed readings; O-11 approve and launch the negative controls; O-12 decide the close and record it in `close-decision.md`. A line stating that the implementer performs none of O-1 to O-12 and that the counted runs, controls, mints, seeds and writes happen only through them. **Section 3** — preconditions P-1.. in order with exact commands: installed runner parity (`cmp` of the installed 0.47.0 `qa-run.mjs` against the repository copy), `preflight` exit 0 on both targets using the INSTALLED runner and the resolved Playwright version recorded, reports' SHA-256 equal to the frozen values, `node build-table-json.mjs --check` and `node selfcheck.mjs` green, kit currency (`KIT_TEMPLATE_ID` of every `login-*.mjs` equals the installed template's), stacks up, token present, dedicated declaration applied, nothing else writing to either project. **Section 4** — per-project procedure using the INSTALLED runner path, the post-run command block with `--probe-env` and `--json`, then `compute-metrics.mjs`; the judging protocol: after `run`, list every `pending-judgment` step in `results.json`, read ONLY the step's capture file, and record `node <installed>/scripts/qa-run.mjs judge --run-dir <dir> --case <n> --step <k> --verdict pass|fail|uncertain --evidence "<what the capture shows>"`, citing visible text or elements, preferring `uncertain` to a guess; and the preparation log protocol (`prep-log.json`, categories `plugin`, `kit`, `environment`, `project-declaration`; any hand-copied `node_modules`, patched plugin file or stale kit script found mid-run is `plugin` or `kit` and makes M7 not met). **Section 5** — the reading rules of v2 §5 plus judged steps (evidence cites visible content; "Would the capture have contradicted the verdict?"; a judged pass whose capture does not show the criterion is a `FALSE PASS`), and the `compute-metrics` target table M1-M7 with exit codes. **Section 6** — the plan guide per case, copied from the frozen table (classes and counts are copied, never re-derived), using the v3 vocabulary where it targets a v2 loss: T-1/S-1 `label_text` for inputs whose label is not associated (KD-8); T-2 `effect: write`, `chosen_inputs` for the new value, the success message by report words after the save (KD-12), restore step; S-4 per D-F (KD-10); S-5 `judge` kind `visual` with the report's own criterion; S-6 indexed avatar item in its container and an `expect_requests` method set (KD-11); case 20 `within` and `name_prefix` for the group and the live count, `chosen_inputs` from the seeded title for the search (KD-16, KD-17), `judge` `language`/`checklist` only where the report states the criterion; X-1 executed, ending `fail` if the product shows an error page (AC-3); T-3, S-3, case 21 declined with their impossible codes; the cases outside the table declined or record-resolved as in v2; every `fill` value and expectation from the report's words or `{{captures}}`; no Save, submit or delete in a prefix ground. **Section 7** — the negative-control procedure of the v2 runbook (separate run directory, one-entry `plan.json`, excluded from the metrics) and a table whose rows are exactly `| NC-1 |` to `| NC-12 |`, one per new kind: NC-1 opacity (`expect_visible` on a closed modal whose content is in the DOM, KD-9; expected `fail`), NC-2 `within` (expect the occurrence not visible inside the group that holds it; expected `fail`), NC-3 `name_prefix` (a prefix that matches no header; expected `needs-human` `STEP_UNGROUNDED`), NC-4 `label_text` (`expect_value equals` a constant on a filled field; expected `fail`), NC-5 `index` (past the last element; expected `needs-human` `STEP_UNGROUNDED`), NC-6 method set (`["POST"]` where the page sends a PATCH; expected `fail`), NC-7 `chosen_inputs` (a literal in no snapshot; expected `PLAN_ENTRY_INVALID`; and a `fill` followed by `expect_value equals` another value; expected `fail`), NC-8 `effect: write` for a non-dedicated role (expected `blocked` `ROLE_NOT_DEDICATED` before any session), NC-9 `judge visual`, NC-10 `judge language`, NC-11 `judge checklist` (each: a capture of an unrelated page with the report's criterion; recorded by a session not told it is a control; expected verdict `fail` or `uncertain`, never `pass`), NC-12 `read_message` (N/A with the recorded reason while no channel source is declared; otherwise a regex that cannot match; expected `fail`); plus the rule that the `--controls` file lists `required_kinds` covering these kinds. **Section 8** — the two session briefs, adapted from v2 §8 (installed runner path, frozen table, decline T-3/S-3/case 21 with their impossible codes, no report edits, stop after reporting run id and every non-pass case with its code; the judging happens in that session). **Section 9** — how row 9 closes: the counted runs and the reading are the operator's; the files `metrics-final.txt` (the `compute-metrics` output), `dogfood-report.md` and `close-decision.md` are the evidence; row 9 moves past `in-progress` only on the operator's recorded decision against AC-26 (met; closed on an amended signal; or kept open with named causes), after which the operator tells `/relay-execute` to set the row; no status is changed by the tools; and the sentence `HUMAN GATE STILL OPEN: a runner pass is evidence, not approval.` Include the stop conditions of v2 (`FAILED_NON_LOCAL_TARGET`, `FAILED_IGNORE_UNPROVEN`, `FAILED_REPORT_MODIFIED`, `FAILED_ENTRY_COUNT`, `FAILED_KIT_SCRIPT_STALE`, `FAILED_PLAYWRIGHT_UNAVAILABLE`, C3/C6/C6b/C7 failing, any secret in terminal output). **Section 10** — what is verified by `selfcheck.mjs` and what only the real runs can show. No credential, token, account name, extracted code or personal value anywhere; accounts are "the dedicated teacher account" and "the dedicated student account".
- **MIRROR**: `# SOURCE: PRPs/reports/qa-runner-grounding-vocabulary-v2/phase-8/qa-run-runbook.md:214-220` and `# SOURCE: PRPs/reports/qa-runner-grounding-vocabulary-v2/phase-8/qa-run-runbook.md:374-380`
- **VALIDATE**:

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
P9=C:/repos/PRPs-agentic-eng/PRPs/reports/qa-runner-ai-executable-steps/phase-9
node --input-type=module -e '
import fs from "node:fs";
const rb = fs.readFileSync(process.argv[1] + "/qa-run-runbook.md", "utf8");
const bad = [];
for (const s of ["The counted runs are NOT executed by the implementer.", "## 1. Read this first", "## 2. Ownership", "## 3. Preconditions", "## 4. The procedure", "## 5. Reading every pass against its evidence", "## 6. The plan guide", "## 7. Negative controls", "## 8. Session briefs", "## 9. Closing row 9", "## 10. What is verified and what is not", "HUMAN GATE STILL OPEN: a runner pass is evidence, not approval.", "apply-dedicated-flag.mjs", "qa-run.mjs judge", "--probe-env", "compute-metrics.mjs", "post-run-checks.mjs", "pass-worksheet.mjs", "close-decision.md", "metrics-final.txt", "prep-log.json", "required_kinds", "FAILED_NON_LOCAL_TARGET", "FAILED_KIT_SCRIPT_STALE", "FAILED_PLAYWRIGHT_UNAVAILABLE", "cmp "]) if (!rb.includes(s)) bad.push("runbook lacks: " + s);
const ids = (re, lo, hi) => { const got = new Set([...rb.matchAll(re)].map((m) => +m[1])); const miss = []; for (let i = lo; i <= hi; i++) if (!got.has(i)) miss.push(i); return miss; };
const mo = ids(/^\| O-(\d+) \|/gm, 1, 12); if (mo.length) bad.push("operator rows missing: O-" + mo.join(", O-"));
const mn = ids(/^\| NC-(\d+) \|/gm, 1, 12); if (mn.length) bad.push("control rows missing: NC-" + mn.join(", NC-"));
for (const k of ["opacity", "within", "name_prefix", "label_text", "index", "chosen_inputs", "ROLE_NOT_DEDICATED", "judge visual", "judge language", "judge checklist", "read_message"]) if (!rb.includes(k)) bad.push("no mention of " + k);
if (/Bearer [A-Za-z0-9._-]{12,}|eyJ[A-Za-z0-9_-]{10,}\.|"(?:username|password|email|cellphone|token)"\s*:\s*"[^"]+"/.test(rb)) bad.push("a credential-shaped or account-shaped string is present");
if (/\.claude\/PRPs/.test(rb)) bad.push("a forbidden .claude/PRPs path");
if (/\r/.test(rb)) bad.push("CR found: LF only");
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
console.log("PASS: the runbook states the operator split, 12 operator steps and 12 negative controls");
' "$P9"
```

### Task 10: CREATE dogfood-report.skeleton.md and close-decision.skeleton.md

- **ACTION**: Delivers AC-A8. `Read` `P8/dogfood-report.md` and `Write` `P9/dogfood-report.skeleton.md` with these headings: `# Phase 9 dogfood report — relay 0.47.0 on the two reference reports`; `## 1. Runs` (project, run id, counted or control, installed runner path and whether it equals the repository copy, Playwright version resolved by `preflight`, session notes); `## 2. Setup (counts and mechanisms only)`; `## 3. The cases` (a row per table case: frozen class, declared class, outcome, reason code and its class, steps executed over denominator steps, judged steps, declared steps, Read verdict); `## 4. Metrics against AC-26` (exactly one row per clause with columns Target, Rule, Reading, Met: M1, M2, M3a, M3b, M4, M5, M6, M7, with the AC-26 sentence each clause comes from); `## 5. Negative controls` (NC-1 to NC-12 with expected and observed outcome); `## 6. Preparation log`; `## 7. Divergences` (declared against frozen steps and classes; entries the runner refused); `## 8. Why a target was missed: the lost steps, by cause` (a row per miss with a named cause and its kind: product, report wording, vocabulary, runner defect, environment, judgment; required for every miss); `## 9. Findings` (new `KD-19` onward and `OBS-n`); `## 10. Against the 0.46.0 reading` (27 of 74 steps, 36.5%, 2 of 3 automatable cases, as published, stated with the convention it was counted under, beside the new reading under the new convention, never mixed in one percentage); `## 11. What this report does not decide`. Every cell is a placeholder `TBD - filled after the runs`; the file contains no result, no run id and no number. Also `Write` `P9/close-decision.skeleton.md`: a title, a table with one row per AC-26 clause (the seven metrics plus "no pass is false" read with the controls) with columns `Clause`, `Evidence file`, `Met`, `Attributed cause if missed`, then three options as unchecked lines (`close row 9 as met`, `close row 9 on an amended signal`, `keep row 9 open`), an operator decision line, a date line, the evidence list (`metrics-final.txt`, `dogfood-report.md`, both worksheets, the controls file, the preparation log), and the sentence `Row 9 changes status only on this record.` and `HUMAN GATE STILL OPEN: a runner pass is evidence, not approval.`
- **MIRROR**: `# SOURCE: PRPs/reports/qa-runner-grounding-vocabulary-v2/phase-8/qa-run-runbook.md:374-380` (the control procedure the report's section 5 records) and `# SOURCE: PRPs/reports/qa-runner-grounding-vocabulary-v2/phase-8/pre-run-table.md:23-42` (the convention the report must state it counted under)
- **VALIDATE**:

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
P9=C:/repos/PRPs-agentic-eng/PRPs/reports/qa-runner-ai-executable-steps/phase-9
node --input-type=module -e '
import fs from "node:fs";
const dir = process.argv[1];
const rep = fs.readFileSync(dir + "/dogfood-report.skeleton.md", "utf8");
const dec = fs.readFileSync(dir + "/close-decision.skeleton.md", "utf8");
const bad = [];
for (let i = 1; i <= 11; i++) if (!new RegExp("^## " + i + "\\. ", "m").test(rep)) bad.push("report section " + i + " missing");
for (const k of ["M1", "M2", "M3a", "M3b", "M4", "M5", "M6", "M7"]) if (!new RegExp("^\\| " + k + " \\|", "m").test(rep)) bad.push("no metric row for " + k);
for (let i = 1; i <= 12; i++) if (!new RegExp("^\\| NC-" + i + " \\|", "m").test(rep)) bad.push("no control row NC-" + i);
if (!/27 of 74/.test(rep)) bad.push("section 10 must state the published 0.46.0 reading (27 of 74)");
if (/2026\d{4}T\d{9}Z/.test(rep)) bad.push("the skeleton names a run id");
for (const s of ["Row 9 changes status only on this record.", "HUMAN GATE STILL OPEN: a runner pass is evidence, not approval.", "close row 9 as met", "close row 9 on an amended signal", "keep row 9 open"]) if (!dec.includes(s)) bad.push("close decision lacks: " + s);
for (const t of [rep, dec]) { if (/\r/.test(t)) bad.push("CR found: LF only"); if (/Bearer [A-Za-z0-9._-]{12,}|eyJ[A-Za-z0-9_-]{10,}\.|"(?:username|password|email|cellphone|token)"\s*:\s*"[^"]+"/.test(t)) bad.push("credential-shaped string"); }
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
console.log("PASS: the report and close-decision skeletons are complete and carry no result");
' "$P9"
```

### Task 11: VERIFY scope fence and regression gate (no file is created or changed)

- **ACTION**: Delivers AC-A9 (infrastructure verification: it changes nothing and delivers the guarantee that no repository file other than this plan and the source PRD row moved). Run the commands of `## Validation Commands` Level 3 once more from a clean shell and record the outcome in the implementer's report. If any fence fails, the cause is an edit outside `P9`; revert that edit (it is this phase's own mistake) and rerun, never edit a frozen surface, a test or a check to turn it green. A runner defect discovered while preparing is added to the runbook's section 1 as a candidate finding, not fixed.
- **MIRROR**: `# SOURCE: PRPs/plans/completed/qa-runner-ai-executable-steps-phase-8-release-cut.plan.md:279-282`
- **VALIDATE**:

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
BASE=e1844b6
git cat-file -e "$BASE^{commit}"
git diff --quiet "$BASE" -- plugins scripts documentation docs README.md .claude-plugin package.json package-lock.json
test -z "$(git status --porcelain --untracked-files=all -- plugins scripts documentation docs README.md .claude-plugin package.json package-lock.json)"
git diff --quiet "$BASE" -- plugins/relay/agents/code-reviewer.md plugins/relay/agents/code-reviewer-semantic.md plugins/relay/commands/relay-implement.md plugins/relay/commands/relay-qa-report.md plugins/relay/scripts/visual/capture.mjs
echo "PASS: no repository file outside PRPs/ moved; the five frozen surfaces are byte-identical"
```

## Validation Commands

Every command exits non-zero when its invariant fails. Blocks start with `set -euo pipefail` and the fsmonitor prefix; `P9` is `C:/repos/PRPs-agentic-eng/PRPs/reports/qa-runner-ai-executable-steps/phase-9`.

### Level 1 STATIC_ANALYSIS

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
P9=C:/repos/PRPs-agentic-eng/PRPs/reports/qa-runner-ai-executable-steps/phase-9
for f in dogfood-lib build-table-json compute-metrics post-run-checks pass-worksheet apply-dedicated-flag selfcheck; do
  node --check "$P9/$f.mjs"
done
node --input-type=module -e '
import fs from "node:fs";
const dir = process.argv[1];
const want = ["dogfood-lib.mjs", "pre-run-table.md", "build-table-json.mjs", "pre-run-table.json", "pre-run-table.sha256", "compute-metrics.mjs", "post-run-checks.mjs", "pass-worksheet.mjs", "apply-dedicated-flag.mjs", "selfcheck.mjs", "qa-run-runbook.md", "dogfood-report.skeleton.md", "close-decision.skeleton.md"];
const bad = [];
for (const f of want) {
  if (!fs.existsSync(dir + "/" + f)) { bad.push("missing " + f); continue; }
  const t = fs.readFileSync(dir + "/" + f, "utf8");
  if (/\r/.test(t)) bad.push("CR in " + f);
  if (/Bearer [A-Za-z0-9._-]{12,}|eyJ[A-Za-z0-9_-]{10,}\.|"(?:username|password|email|cellphone|token)"\s*:\s*"[^"]+"/.test(t)) bad.push("credential-shaped string in " + f);
}
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
console.log("PASS: 13 files present, LF-only, no credential-shaped strings");
' "$P9"
```

### Level 2 CONTENT_INVARIANTS

Run the `**VALIDATE**` blocks of Tasks 2, 3, 9 and 10 once more as one block (each already recomputes its counts from the files, nothing is hard-coded except the two report hashes frozen by the PRD), then:

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
P9=C:/repos/PRPs-agentic-eng/PRPs/reports/qa-runner-ai-executable-steps/phase-9
node "$P9/build-table-json.mjs" --check
node --input-type=module -e '
import fs from "node:fs";
import crypto from "node:crypto";
const dir = process.argv[1];
const sha = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const rec = fs.readFileSync(dir + "/pre-run-table.sha256", "utf8").split("\n").filter(Boolean)[0].slice(0, 64);
const bad = [];
if (sha(dir + "/pre-run-table.md") !== rec) bad.push("pre-run-table.md changed after the freeze");
const rb = fs.readFileSync(dir + "/qa-run-runbook.md", "utf8");
const lib = fs.readFileSync(dir + "/dogfood-lib.mjs", "utf8");
if (/CATALOGUE\s*=\s*\[/.test(lib)) bad.push("the library still hard-codes a reason-code list");
if (!rb.includes("/relay/0.47.0/")) bad.push("the runbook does not name the installed 0.47.0 runner");
if (rb.includes("/relay/0.46.0/")) bad.push("the runbook still names the 0.46.0 runner");
if (bad.length) { console.error(bad.join("\n")); process.exit(1); }
console.log("PASS: table unchanged since the freeze; classes derived from the runner; runbook names 0.47.0");
' "$P9"
```

### Level 3 INTEGRATION

```bash
set -euo pipefail
export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.fsmonitor GIT_CONFIG_VALUE_0=false
P9=C:/repos/PRPs-agentic-eng/PRPs/reports/qa-runner-ai-executable-steps/phase-9
node "$P9/selfcheck.mjs"
if SELFCHECK_BREAK=1 node "$P9/selfcheck.mjs"; then echo "FAIL: selfcheck cannot fail"; exit 1; else echo "PASS: selfcheck fails on a broken fixture"; fi
BASE=e1844b6
git cat-file -e "$BASE^{commit}"
git diff --quiet "$BASE" -- plugins scripts documentation docs README.md .claude-plugin package.json package-lock.json
test -z "$(git status --porcelain --untracked-files=all -- plugins scripts documentation docs README.md .claude-plugin package.json package-lock.json)"
git diff --quiet "$BASE" -- plugins/relay/agents/code-reviewer.md plugins/relay/agents/code-reviewer-semantic.md plugins/relay/commands/relay-implement.md plugins/relay/commands/relay-qa-report.md plugins/relay/scripts/visual/capture.mjs
VOUT=$(npm run validate 2>&1)
printf '%s\n' "$VOUT" | tail -n 5
printf '%s\n' "$VOUT" | grep -qF -- "28 passed, 0 failed (28 checks run)" || { echo "FAIL: npm run validate did not report exactly 28 passed, 0 failed (28 checks run)"; exit 1; }
node --test "scripts/validate/**/*.test.mjs"
```

The last two commands are a regression gate: nothing under `scripts/` or `plugins/` changed, so `npm run validate` must still report the byte-exact summary line `28 passed, 0 failed (28 checks run)` (a failing validate also fails the block through `set -e`), and the corpus is unchanged.

## Acceptance Criteria

- **AC-A1 (PRD AC-26, AC-2):** The pre-run table is re-counted under the vocabulary-v3 convention on the same two byte-identical reports (their SHA-256 equal the frozen values), splits impossible-class steps from the denominator, keeps the v2 case classes unchanged, and is frozen (SHA-256 recorded with the freeze instant, JSON derived and re-checkable) before any counted run exists. Delivered by Tasks 2 and 3.
- **AC-A2 (PRD AC-26):** `compute-metrics.mjs` reads every clause of AC-26 (at least 90% of the non-impossible objective steps executed per project and combined; every `needs-human` step catalogued with every impossible-class claim matching the table in both directions; at least 80% driver-executed over the automatable class; no false pass and every negative control failing as expected; scans clean; zero manual preparation) and exits non-zero when any is not met or an integrity check fails, with its reason classes derived from the runner's own catalogue. Delivered by Tasks 1 and 4.
- **AC-A3 (PRD AC-21, AC-26):** `post-run-checks.mjs` proves the freeze preceded the run, keeps the secrecy and privacy scans, and extends them to extracted verification codes (by environment-variable name, never printing a value) and to judged and message-derived files, which must sit in the ignored evidence directory. Delivered by Task 5.
- **AC-A4 (PRD AC-26):** `pass-worksheet.mjs` lets every pass, passed step and judged step be read against its evidence, with judged steps showing criterion, verdict, cited evidence and capture dimensions and flagging uncited verdicts. Delivered by Task 6.
- **AC-A5 (PRD AC-12, AC-26):** The dedicated-role declaration needed by the write steps of T-2 and S-6 is applied only by the operator, through a dry-run-first helper that touches only the requested roles and prints no value; the implementer verifies it on a fabricated fixture only. Delivered by Task 7.
- **AC-A6 (PRD AC-26):** `selfcheck.mjs` proves, with at least 28 seeded-fault checks and a `SELFCHECK_BREAK` mode, that each tool accepts a clean fixture and rejects each fault, so no gate of the measurement is cosmetic. Delivered by Task 8.
- **AC-A7 (PRD AC-26):** The runbook states that the counted runs are NOT executed by the implementer, lists twelve OPERATOR steps with the exact command and the proving check, gives the plan guide per case, the judging protocol, the preparation-log protocol and twelve negative controls covering every new step kind and judgment kind, and records whether `read_message` is needed (it is not, while no local channel source is declared). Delivered by Task 9.
- **AC-A8 (PRD AC-26):** A report skeleton with one row per AC-26 clause and a required attributed cause for every miss, and a close-decision skeleton, exist; row 9 changes status only on the operator's recorded decision, with the metrics file as evidence. Delivered by Tasks 10 and 9.
- **AC-A9 (PRD AC-24, AC-26 scope):** No repository file other than this plan and the source PRD's row 9 changes; the five frozen surfaces are byte-identical; `npm run validate` and the corpus stay green; no credential, token, extracted code, account name or personal value is written. Verified by Task 11 (infrastructure verification, delivers no new criterion beyond this fence).

Every task names the criterion it delivers: Task 1 (AC-A2), Tasks 2 and 3 (AC-A1), Task 4 (AC-A2), Task 5 (AC-A3), Task 6 (AC-A4), Task 7 (AC-A5), Task 8 (AC-A6), Task 9 (AC-A7, AC-A8), Task 10 (AC-A8), Task 11 (AC-A9).

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| The re-counted table is wrong or drifts toward a convenient number (counts chosen after seeing the result) | M | H | Counts come from the reports' own words via `parse`; the table is frozen and hashed before any run, `loadTable` refuses an edited file, corrections only as dated addenda; the post-run C0 check requires the freeze to precede the run |
| A model judgment passes what a person would fail (the session that planned also judges) | M | H | Verdicts must cite visible evidence; `uncertain` is a gap, never a pass; a separate reading session re-reads every judged pass against its capture; NC-9 to NC-11 judge captures of unrelated pages |
| The counted run uses the repository copy of the runner or a different Playwright than the installed cache (OBS-3) | M | M | O-6 and P-1 compare the installed and repository `qa-run.mjs` with `cmp`, run `preflight` from the installed copy, and record the resolved Playwright version (cache 1.64.1 against corpus 1.61.1) in the report |
| T-2 and S-6 end `blocked` `ROLE_NOT_DEDICATED` because no role declares `dedicated` | H until O-4 | H | Task 7 helper; O-4 is a precondition; the runbook states which cases it unlocks |
| The praesto-sum root named in the hand-off is not the project (only credential-named files were found there) | M | M | Task 2 locates the root by the report's SHA-256 and stops writing if none matches; O-1 asks the operator; credential-named files are never opened |
| The 90% target is missed because of steps the report leaves open or the product does not satisfy (S-4, case 20's search, the pt-BR and checklist criteria) | M | M | Misses are attributed to a named cause by section 8 of the report; AC-26 is read as met or not met; the close decision may be an amended signal, the operator's call |
| A write step changes a shared account or state | L | H | Writes run only for roles declared dedicated by the operator; restore steps from the report; the local-only guard stays on; no Save, submit or delete in a prefix ground |
| A message source is adopted late and invalidates the frozen counts for T-3 and S-3 | L | M | Adoption only before any run and only with a dated addendum and rebuilt JSON; the default table treats them as impossible |
| Importing `qa-run.mjs` from the library runs a mode on import | L | M | Task 1 validation imports it and the corpus already imports its exports; the task stops rather than copying the catalogue |
| The kit scripts live in a git-ignored folder, so a worktree run could write them elsewhere | M | L | Absolute `C:/repos/PRPs-agentic-eng/...` paths throughout; the runbook states that the phase-9 folder is copied out of any worktree before cleanup |

## Notes

**TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.

**Test-file routing:** this phase's test-file creation and updates are
routed through the `test-writer`/`test-reviewer` pair's lifecycle
ledger (`/relay-write-test` → `/relay-test-write-review`), not authored
by the Implementer — R-X is a blanket straight-fail on any test glob in
the Implementer's diff. No task below and no `## Files to Change` row
targets a test file, so this plan's `**VALIDATE**` commands exercise the
change directly rather than invoking the test framework.

**What the test pair should expect.** All thirteen deliverables live in a git-ignored folder outside every test glob (`selfcheck.mjs` is dogfood-tooling verification run by the Implementer as the VALIDATE gate, deliberately not named `*.test.*`/`*.spec.*` and not a repository test). No product code and no file of `plugins/relay/` or `scripts/validate/` changes. The legitimate aggregate verdict is `EXISTING_COVERAGE_SUFFICIENT`: the behaviour under test (the runner, its catalogue, `qa-run-contract`) is already covered by the corpus that Level 3 re-runs, and the new tooling's own coverage is the 28-check `selfcheck.mjs`. If the pair concludes the kit warrants repository tests, they are theirs to author and would be recorded in the lifecycle ledger; this plan neither requires nor forbids that.

**How the work divides.** Autonomous (implementer, Tasks 1-11): the library, the frozen table and its SHA-256, the metrics, post-run and worksheet tools, the dedicated-flag helper, the self-check with seeded faults, the runbook, the report and close-decision skeletons, the scope fence. Operator (runbook O-1 to O-12): confirm the praesto-sum root; start its dev server; provide the owner token through the ignored credentials file or environment; decide the mail source and apply the dedicated declaration; confirm the `super-ensino` stack; installed-runner parity and `preflight`; launch the two counted command sessions; approve prefix grounding; run the post-run checks; read the worksheets; launch and read the negative controls; decide the close.

**How row 9 closes.** Completing this plan takes row 9 to `implemented` (the kit is ready), not to `complete`. `/relay-execute` should then stop for the operator rather than run any counted run. The operator executes the runbook, files `metrics-final.txt`, `dogfood-report.md` and `close-decision.md`, and row 9 is set to its final state only on the operator's recorded decision against AC-26 (met; closed on an amended signal; or kept open), with the metrics file as evidence. A missed target is reported as missed with a named cause; nothing is repaired by editing a results file, a plan or the frozen table.

**Mail and SMS.** `read_message` (phase 6) is needed only if a case in the reports uses a local channel source. The reports' T-3 and S-3 start an e-mail or SMS verification, and neither target declares `channel_sources` at planning time, so the default table treats both cases as impossible-class and NC-12 is recorded N/A with that reason. Adopting a local Mailpit for `super-ensino` (an operator change to that project's mail host) before any run, followed by a dated table addendum, would turn T-3's steps into denominator steps and make NC-12 executable.

**Playwright version.** The installed cache resolves Playwright 1.64.1 while the repository corpus runs 1.61.1. Group scope is implemented with chained locators precisely so it works on either; the risk to watch is a behavioural difference in `checkVisibility`-dependent steps, which NC-1 exercises on the real product.

**Open for the operator, recorded not decided here:** the praesto-sum root directory (O-1); whether to keep the old `dedicated`-less kit for a comparison run (not planned); whether the seeded identity captures recommended by AC-23 (a `username` capture for T-1 and A-1, the seeded occurrence's title) are added to the kit before the run (KD-14, KD-16) — optional, listed in the preparation log as `project-declaration` if done.

R8b (PRD AC-N token check) applies in PRD mode; every acceptance criterion above cites PRD AC-26, AC-2, AC-12, AC-21 or AC-24.

*Generated: 2026-10-22*
*Approved: 2026-10-22*
*Implemented: 2026-10-22*
*Status: IMPLEMENTED*
