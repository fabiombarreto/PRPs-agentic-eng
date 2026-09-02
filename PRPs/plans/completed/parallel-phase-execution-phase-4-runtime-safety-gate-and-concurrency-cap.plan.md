# Feature: Runtime-safety gate and concurrency cap (Phase 4 of parallel-phase-execution)

```
**Decision Gate**
- Active context: none
- Activated criteria: introduces a new opt-in methodology gating key, which carries a standing non-heuristic contract; extends the orchestrator's Phase A.0 budget set; depends on a capability that is registered and explicitly BLOCKED
- Decisions found:
  - **[2026-05-15] Runnable worktree environments — registered future feature, implementation BLOCKED.** Its out-of-scope list forbids modifying `implementer` / `test-runner` to assume a runnable environment exists. This phase implements none of its strategies: it adds a DECLARATION and degrades to serial in its absence, which is the only honest way to proceed without assuming the blocked capability
  - [2026-04-19] TDD activation is opt-in by explicit declaration only — the precedent every gating key since has followed
  - [2026-05-01] Per-stage retry budget composition (D3): each downstream command owns its internal loop budget; the orchestrator adds session-level budgets — `max_lanes_in_flight` joins that set
  - [2026-08-05] Plugin-owned resources live in `plugins/relay/resources/` — the gate's semantics extend the lane contract
  - [2026-04-19] `.claude/settings.json` allowlist and the interactivity boundary — the gate is read, never prompted for
- Applicable anti-patterns:
  - **Flipping `figma_track` (or any future opt-in gating key) by heuristic (docs/anti-patterns.md:89)** — the single most binding rule here: the gate is declared, never inferred from a stack scan, a port grep, or a docker-compose file
  - Activating the test pair by heuristic (:43) — same discipline, same reason
  - Relying on interactive permission prompts in the autonomous loop (:80)
  - Writing pipeline artifacts under the agent config directory (:61)
- Applicable architectural rules:
  - Graceful degradation: absence of the declaration means serial, and the reason is recorded rather than silent
  - Three-pillar Pillar 2; writer/reviewer split; `PRPs/` artifact paths
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/parallel-phase-execution.prd.md` — Implementation Phases row 4:
  "Runtime-safety gate and concurrency cap" — Goal: Never run lanes concurrently
  where the test stage would collide, and never run more lanes than the budget
  tolerates. — Success signal: A project with no declaration runs serially and
  says why; a wide PRD never exceeds the cap.

## Summary

Two lanes running their test stages at once would contend on ports, container
names and database namespaces — and the capability that would make that safe is
registered in `docs/decisions.md` and explicitly BLOCKED, with an out-of-scope
list forbidding any assumption that a runnable environment exists. This phase
therefore gates on a **declaration** rather than a detection: a new
`lane_runtime_safe` methodology key, defaulting to `false`, whose absence or
falsity forces serial execution with the reason recorded in the run log. It also
bounds exposure with `max_lanes_in_flight`, a session-level budget joining the
set Phase A.0 already initialises, with the remainder queued rather than dropped.
The key registers in the existing extensible `gating-structure` check rather than
adding a new check module — that registry was built for exactly this, and its own
comment says so.

## User Story

As a relay operator whose test stage binds a fixed port,
I want relay to run serially unless I have declared otherwise,
So that concurrency never silently breaks a suite that was correct when serial.

## Problem Statement

Test-stage resource contention is entirely unaddressed, and the finding is
silence: neither `test-runner.md` nor `relay-test.md` mentions ports, container
names or database namespaces anywhere. The only related idea in the repository is
a commented-out, opt-in PORT-offset snippet in `context-builder`'s SKILL.md,
which is part of no agent contract. Meanwhile the capability that would resolve
this properly — runnable worktree environments — is registered and BLOCKED until
its own PRD is approved, and its Context states plainly that parallel runs
"cannot reliably start a dev server, a test stack, or a database inside their own
worktree folders without manual, collision-prone setup". Separately, N unbounded
lanes is an unmeasured exposure to rate and token limits.

## Solution Statement

Add `lane_runtime_safe` to the methodology declaration with the same three
non-heuristic properties every gating key since `docs_sync` has carried:
default-false emission on `*init`, preserve-on-`*update`, and backfill only when
the key is entirely absent. Absent or `false` means lanes do not run
concurrently, and the run log records which of the two it was. Add
`max_lanes_in_flight` to Phase A.0's budget set with a provisional value, queuing
the remainder, and state plainly that the value is provisional pending phase 7's
fixture — guessing a tuned number now would be the same error the PRD refused
when it declined to set a speedup target. Register the key in the existing
`gating-structure` SITES array, which its own module comment designates as the
extension point for exactly this.

## Metadata

| Field | Value |
|-------|-------|
| Type | feature |
| Complexity | Medium |
| Systems Affected | `plugins/relay/resources/lane-model.md`, `plugins/relay/skills/context-builder/SKILL.md`, `plugins/relay/commands/relay-execute.md`, `scripts/validate/checks/gating-structure.mjs` |
| Dependencies | Phase 1 (lane model) — `complete` |
| Estimated Tasks | 5 |
| Source PRD line ref | `PRPs/prds/parallel-phase-execution.prd.md:189` |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `scripts/validate/checks/gating-structure.mjs` | 1-75 | The extension point. Its own comment designates the `SITES` array as where a future opt-in key is registered "instead of creating a new check module" — which is why this phase adds no 23rd check. |
| P0 | `plugins/relay/skills/context-builder/SKILL.md` | 630-750 | The three documentation sites every gating key occupies: the frontmatter template, the `*init` default-emission bullet, and the `*update` preservation bullet. |
| P0 | `plugins/relay/resources/lane-model.md` | 1-300 | The contract this extends; `## Lane outcomes and state ownership` is the sibling the new section sits beside. |
| P1 | `plugins/relay/commands/relay-execute.md` | 700-760 | Phase A.0 — the budget set `max_lanes_in_flight` joins, and the shape those budget lines take. |
| P1 | `docs/decisions.md` | 573-590 | The runnable-worktree-environments entry: registered, BLOCKED, and forbidding any assumption that a runnable environment exists. This is what makes a declared gate the only available design. |
| P1 | `PRPs/prds/parallel-phase-execution.prd.md` | 76-99 | AC-7 and AC-8 verbatim — declared gate with a recorded reason, and a cap that a wide PRD cannot exceed. |

## Patterns to Mirror

```
# SOURCE: scripts/validate/checks/gating-structure.mjs:66-73
  {
    key: 'visual_first_approval',
    markers: [
      { id: 'default-auto-emission', pattern: /always emit `visual_first_approval: auto`/i },
      { id: 'preserve-on-update', pattern: /`visual_first_approval`\s*preservation/i },
      { id: 'backfill-only-when-absent', pattern: /backfill\s*`visual_first_approval: auto`/i },
    ],
  },
```
Task 4 copies this entry shape verbatim for `lane_runtime_safe`, including the
three marker ids. Tasks 2 and 3 author the SKILL.md prose these three patterns
match — the markers and the prose are one change, and authoring either alone
produces a check that fails or a key that is undocumented.

```
# SOURCE: plugins/relay/skills/context-builder/SKILL.md:694-700
- Always emit `visual_first_approval: auto` — the per-project default
  approval mode for the Figma Visual-First Track's visual-first
  blocking gate defaults to `auto`, mirroring the `figma_track`
  default-emission precedent verbatim. Never heuristically inferred;
  always emitted deterministically on every `*init` run. Flips to
  `human` only via a human edit to this file — no command flips it
```
Task 2 mirrors this bullet's structure and, above all, its explicit
never-heuristically-inferred sentence. That sentence is the whole content of the
anti-pattern at `docs/anti-patterns.md:89`.

```
# SOURCE: plugins/relay/skills/context-builder/SKILL.md:740-748
  - **`visual_first_approval` preservation**: if `visual_first_approval`
    is already present in the frontmatter, preserve its value
    untouched — validated human/command input, same treatment as
    `figma_track`. If the key is entirely absent (a project
    initialized before this key existed), backfill
    `visual_first_approval: auto` — this is the ONLY case where
    `*update` adds this key; never remove or flip an existing value.
```
Task 3 mirrors this preservation bullet exactly: preserve an existing value,
backfill only when entirely absent, and never flip.

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/resources/lane-model.md` | UPDATE | Define what the gate means, what the cap does, and why the absence of a declaration must degrade to serial rather than to a guess. |
| `plugins/relay/skills/context-builder/SKILL.md` | UPDATE | The three gating-key documentation sites: frontmatter template, `*init` emission, `*update` preservation. |
| `scripts/validate/checks/gating-structure.mjs` | UPDATE | Register `lane_runtime_safe` in `SITES` — the designated extension point, so no new check module is created. |
| `plugins/relay/commands/relay-execute.md` | UPDATE | Add `max_lanes_in_flight` to Phase A.0's budget set and state the gate read plus the recorded reason. |
| `docs/context/methodology.md` | UPDATE | This repository declares the key at its default, so the repo is self-consistent with the contract its own plugin now emits. |

## NOT Building (Scope Limits)

- **Any of the six runnable-worktree-environment strategies.** That capability is
  registered and BLOCKED; this phase gates on a declaration precisely so it need
  assume none of them.
- **Detecting runtime contention.** No port scan, no docker-compose parse, no
  stack sniffing. Inferring this key would violate `docs/anti-patterns.md:89`
  directly.
- **Actually dispatching lanes concurrently, or enforcing the cap at runtime.**
  Phase 5 owns dispatch; this phase declares the gate and the budget it will read.
- **Tuning the cap.** Its value is provisional; phase 7's fixture is the
  instrument meant to set it, and the PRD records that as an open question.
- **Flipping this repository's own declaration to `true`.** The default is
  `false` and only a human edit changes it — including here.

## Step-by-Step Tasks

### Task 1: UPDATE `plugins/relay/resources/lane-model.md`

**ACTION**: Add a section headed byte-exactly `## Runtime safety and the
concurrency cap`, placed after `## Lane outcomes and state ownership` and before
`## Named-code registry`. It defines:
(a) **The gate** — `lane_runtime_safe`, read from the target project's
`docs/context/methodology.md`. `true` means the project declares its test stage
does not contend on shared runtime resources. Absent or `false` means lanes do
NOT run concurrently, and the orchestrator records which of the two it was.
(b) **Why a declaration and not a detection** — cite the registered, BLOCKED
runnable-worktree-environments capability and its prohibition on assuming a
runnable environment exists, and state that inferring the key would violate the
standing no-heuristic-gating rule.
(c) **The cap** — `max_lanes_in_flight`, a session-level budget. At most that
many lanes are in flight at once; the remainder queue rather than being dropped.
State the value is PROVISIONAL and that phase 7's fixture is the instrument
meant to set it, because guessing a tuned number now would repeat the error the
PRD refused when it declined to set a speedup target.
(d) **Degradation is recorded, never silent** — the run log carries why serial
execution was chosen, distinguishing "no declaration" from "declared unsafe".
Delivers **AC-A1**.
**MIRROR**: `# SOURCE: plugins/relay/skills/context-builder/SKILL.md:694-700`
**VALIDATE**:
```bash
set -euo pipefail
L=plugins/relay/resources/lane-model.md
for H in '^## Lane outcomes and state ownership$' '^## Runtime safety and the concurrency cap$' '^## Named-code registry$'; do
  C=$(grep -c "$H" "$L")
  if [ "$C" -ne 1 ]; then echo "FAIL: heading $H occurs $C times; expected exactly 1"; exit 1; fi
done
O=$(grep -n '^## Lane outcomes and state ownership$' "$L" | cut -d: -f1)
S=$(grep -n '^## Runtime safety and the concurrency cap$' "$L" | cut -d: -f1)
R=$(grep -n '^## Named-code registry$' "$L" | cut -d: -f1)
if [ "$O" -lt "$S" ] && [ "$S" -lt "$R" ]; then echo "PASS: section correctly placed"; else echo "FAIL: order $O / $S / $R"; exit 1; fi
grep -q 'lane_runtime_safe' "$L"
grep -q 'max_lanes_in_flight' "$L"
grep -qi 'provisional' "$L"
# The blocked-capability justification must be present, or the design reads as
# arbitrary conservatism rather than the only available option.
grep -qi 'runnable worktree' "$L"
echo "PASS: gate, cap, provisional marker and blocked-capability rationale all present"
```

### Task 2: UPDATE `plugins/relay/skills/context-builder/SKILL.md` — frontmatter and `*init` emission

**ACTION**: Two edits. First, add a `lane_runtime_safe: false` line to the
methodology frontmatter template, immediately after the `visual_first_approval`
line, with an inline comment reading
`# true | false — declares the project's test stage does not contend on shared runtime resources (ports, containers, databases); default off, never heuristically flipped`.
Second, add an `*init` emission bullet beginning byte-exactly
`- Always emit ` followed by `` `lane_runtime_safe: false` `` — mirroring the
`visual_first_approval` bullet's structure — placed immediately after that
bullet. It must state that the value is never heuristically inferred (no port
scan, no compose-file parse, no stack detection), is emitted deterministically on
every `*init` run, and flips to `true` only via a human edit to this file, with
no command flipping it.
Delivers **AC-A2**.
**MIRROR**: `# SOURCE: plugins/relay/skills/context-builder/SKILL.md:694-700`
**VALIDATE**:
```bash
set -euo pipefail
S=plugins/relay/skills/context-builder/SKILL.md
grep -q 'lane_runtime_safe: false        # true | false' "$S" || grep -q 'lane_runtime_safe: false' "$S"
grep -q 'Always emit `lane_runtime_safe: false`' "$S"
# The never-heuristic sentence is the whole point of the bullet; its absence
# would leave the key documented but the discipline unstated.
awk '/Always emit `lane_runtime_safe: false`/{f=1} f&&/[Nn]ever heuristically inferred/{ok=1} f&&/^- Always emit `[a-z_]+`/&&!/lane_runtime_safe/{f=0} END{if(!ok){print "FAIL: no never-heuristically-inferred sentence in the lane_runtime_safe emission bullet"; exit 1} print "PASS: emission bullet carries the non-heuristic statement"}' "$S"
```

### Task 3: UPDATE `plugins/relay/skills/context-builder/SKILL.md` — `*update` preservation

**ACTION**: Add a preservation bullet beginning byte-exactly
`  - **\`lane_runtime_safe\` preservation**:` immediately after the
`visual_first_approval` preservation bullet. It states: if the key is already
present, preserve its value untouched; if it is entirely absent (a project
initialized before this key existed), backfill `lane_runtime_safe: false` — the
ONLY case where `*update` adds this key; never remove or flip an existing value;
and heuristics MUST NOT flip it, only a human edit can. The literal
`backfill \`lane_runtime_safe: false\`` must appear, because the registered
check's third marker matches exactly that.
Delivers **AC-A3**.
**MIRROR**: `# SOURCE: plugins/relay/skills/context-builder/SKILL.md:740-748`
**VALIDATE**:
```bash
set -euo pipefail
S=plugins/relay/skills/context-builder/SKILL.md
grep -q '`lane_runtime_safe` preservation' "$S"
grep -q 'backfill `lane_runtime_safe: false`' "$S"
# It must sit in the *update preservation list, after its sibling.
V=$(grep -n '`visual_first_approval` preservation' "$S" | head -1 | cut -d: -f1)
N=$(grep -n '`lane_runtime_safe` preservation' "$S" | head -1 | cut -d: -f1)
if [ "$V" -lt "$N" ]; then echo "PASS: preservation bullet follows its sibling"; else echo "FAIL: positions $V / $N"; exit 1; fi
```

### Task 4: UPDATE `scripts/validate/checks/gating-structure.mjs`

**ACTION**: Append a third entry to the `SITES` array for key
`lane_runtime_safe`, copying the `visual_first_approval` entry's shape exactly:
markers `default-false-emission` matching ``/always emit `lane_runtime_safe: false`/i``,
`preserve-on-update` matching ``/`lane_runtime_safe`\s*preservation/i``, and
`backfill-only-when-absent` matching ``/backfill\s*`lane_runtime_safe: false`/i``.
Do NOT create a new check module — the module's own comment designates this array
as the extension point for a future opt-in key, and adding a module instead would
contradict it.
Delivers **AC-A4**.
**MIRROR**: `# SOURCE: scripts/validate/checks/gating-structure.mjs:66-73`
**VALIDATE**: the registration is exercised through the check itself, and shown
able to fail:
```bash
set -euo pipefail
node --input-type=module -e '
import { checkGatingStructure } from "./scripts/validate/checks/gating-structure.mjs";
import { readFileSync } from "node:fs";
const real = readFileSync("plugins/relay/skills/context-builder/SKILL.md", "utf-8");
const ok = checkGatingStructure({ skillContent: real });
if (!ok.ok) { console.error("FAIL: the real SKILL.md must satisfy every registered site: " + JSON.stringify(ok.findings)); process.exit(1); }
if (!/lane_runtime_safe/.test(readFileSync("scripts/validate/checks/gating-structure.mjs","utf-8"))) {
  console.error("FAIL: lane_runtime_safe is not registered in SITES"); process.exit(1);
}
const stripped = real.split(String.fromCharCode(10)).filter(l => !/backfill `lane_runtime_safe: false`/.test(l)).join(String.fromCharCode(10));
const bad = checkGatingStructure({ skillContent: stripped });
if (bad.ok) { console.error("FAIL: removing the backfill marker must be caught"); process.exit(1); }
console.log("PASS: the new site is registered, satisfied by the real file, and its absence is detected");
'
```

### Task 5: UPDATE `plugins/relay/commands/relay-execute.md` and `docs/context/methodology.md`

**ACTION**: Two edits. First, in `### Phase A.0 — Initialise orchestrator state`,
add a budget bullet beginning byte-exactly
`- \`max_lanes_in_flight = 3\`` stating that it caps lanes in flight, that the
remainder queue, and that the value is provisional pending the phase-7 fixture.
Add a following bullet beginning byte-exactly
`- \`lane_runtime_safe\`` describing the read from the target project's
`docs/context/methodology.md`, that absent or `false` forces serial execution,
and that the run log records which of the two applied. Both must name
`resources/lane-model.md` as the authority rather than restating its rules.
Second, add `lane_runtime_safe: false` to this repository's own
`docs/context/methodology.md` frontmatter, so the repo is self-consistent with
the key its plugin now emits. Keep it at the default: only a human edit flips it,
and that includes this one.
Delivers **AC-A5**.
**MIRROR**: `# SOURCE: scripts/validate/checks/gating-structure.mjs:66-73`
**VALIDATE**:
```bash
set -euo pipefail
E=plugins/relay/commands/relay-execute.md
grep -q '`max_lanes_in_flight = 3`' "$E"
grep -q 'lane_runtime_safe' "$E"
grep -q 'resources/lane-model.md' "$E"
# The budget bullets must live inside Phase A.0, not elsewhere.
A0=$(grep -n '^### Phase A.0 ' "$E" | head -1 | cut -d: -f1)
A1=$(grep -n '^### Phase A.1 ' "$E" | head -1 | cut -d: -f1)
M=$(grep -n '`max_lanes_in_flight = 3`' "$E" | head -1 | cut -d: -f1)
if [ "$A0" -lt "$M" ] && [ "$M" -lt "$A1" ]; then echo "PASS: cap declared inside Phase A.0"; else echo "FAIL: positions A0=$A0 cap=$M A1=$A1"; exit 1; fi
# This repository declares the key, at its default.
grep -q '^lane_runtime_safe: false$' docs/context/methodology.md
echo "PASS: orchestrator budgets and repo declaration both present"
```

## Validation Commands

**Level 1 — STATIC_ANALYSIS**

```bash
set -euo pipefail
node --check scripts/validate/checks/gating-structure.mjs
npm run validate 2>&1 | grep -q '^\[PASS\] line-endings$'
# The methodology frontmatter must still parse as YAML after the new key.
node -e "const t=require('fs').readFileSync('docs/context/methodology.md','utf8');const m=t.match(/^---([\s\S]*?)---/);if(!m){console.error('FAIL: no frontmatter');process.exit(1)};if(!/^lane_runtime_safe:\s*(true|false)\s*$/m.test(m[1])){console.error('FAIL: lane_runtime_safe missing or not boolean');process.exit(1)};console.log('PASS: frontmatter carries a boolean lane_runtime_safe')"
```

**Level 2 — CONTENT_INVARIANTS**

```bash
set -euo pipefail
# The three gating sites must ALL be satisfied — the check is what enforces
# that, so assert through it rather than around it.
npm run validate 2>&1 | grep -q "^\[PASS\] gating-structure$"
# The registry must now carry three sites; two would mean the new one silently
# did not register and the check would pass while guarding nothing new.
# Counted with grep rather than a nested node script: the SITES key lines
# contain apostrophes, and embedding them in a quoted inline script is what
# turned an earlier revision of this block into a syntax error that failed in
# BOTH directions — neither passing nor failing for the reason it claimed.
N=$(grep -cE "^    key: '[a-z_]+'," scripts/validate/checks/gating-structure.mjs)
if [ "$N" -lt 3 ]; then
  echo "FAIL: gating registry has $N sites; expected at least 3"; exit 1
fi
echo "PASS: gating registry carries $N sites and the real SKILL.md satisfies all of them"
# The earlier phases' checks must still be green after the contract grew again.
npm run validate 2>&1 | grep -q "^\[PASS\] lane-contract$"
npm run validate 2>&1 | grep -q "^\[PASS\] lane-state-writers$"
```

**Level 3 — INTEGRATION**

```bash
set -euo pipefail
# This phase deliberately adds no new check, so there is no `[PASS] <name>` line
# to grep. Without the assertion below, `npm run validate` alone is green on the
# unmodified tree and this level could not tell the phase's work from its absence.
grep -q "lane_runtime_safe" scripts/validate/checks/gating-structure.mjs
npm run validate
node --test "scripts/validate/checks/*.test.mjs"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-7, AC-8):** `lane-model.md` carries a `## Runtime safety and
  the concurrency cap` section defining `lane_runtime_safe` and
  `max_lanes_in_flight`, justifying the declaration against the registered and
  BLOCKED runnable-worktree-environments capability, marking the cap's value
  provisional, and requiring the degradation reason to be recorded rather than
  silent.
- **AC-A2 (PRD AC-7):** `SKILL.md` emits `lane_runtime_safe: false` on `*init`
  with an explicit never-heuristically-inferred statement, and carries the key in
  its frontmatter template.
- **AC-A3 (PRD AC-7):** `SKILL.md` preserves an existing `lane_runtime_safe`
  value on `*update` and backfills the default only when the key is entirely
  absent.
- **AC-A4 (PRD AC-7):** `lane_runtime_safe` is registered as a third site in the
  existing `gating-structure` `SITES` array — no new check module — and removing
  any one of its three markers from SKILL.md makes the check fail.
- **AC-A5 (PRD AC-8):** `relay-execute.md`'s Phase A.0 declares
  `max_lanes_in_flight = 3` with the remainder queued and the value marked
  provisional, and reads `lane_runtime_safe` recording which degradation reason
  applied; this repository declares the key at its default.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| A future edit starts inferring `lane_runtime_safe` from a docker-compose file or a port grep | M | H | The registered gating site makes the three non-heuristic properties structurally checkable, and the anti-pattern at `docs/anti-patterns.md:89` names this exact failure |
| The provisional cap of 3 is wrong and either wastes capacity or exhausts rate limits | H | M | It is marked provisional in the contract and in Phase A.0, and phase 7's fixture is the named instrument for setting it; the PRD records it as an open question rather than pretending it is settled |
| Defaulting to `false` means the feature does nothing for every existing project | H | L | Correct and intended: a project must opt in, exactly as `tdd`, `docs_sync` and `figma_track` require. The alternative is assuming a blocked capability |
| A project declares `true` while its suite really does bind a fixed port | M | H | Out of relay's reach — the declaration is the operator's assertion. The contract states plainly what the declaration claims, so the assertion is informed |
| Registering a third site perturbs the `gating-structure` check's own tests | M | M | Level 3 runs the full corpus, which is where a hardcoded site count would surface; the test-after pair extends those tests in the same phase |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- **Test-file routing:** this phase's test-file creation and updates are
  routed through the `test-writer`/`test-reviewer` pair's lifecycle
  ledger (`/relay-write-test` → `/relay-test-write-review`), not authored
  by the Implementer — R-X is a blanket straight-fail on any test glob in
  the Implementer's diff. No task below and no `## Files to Change` row
  targets a test file, so this plan's `**VALIDATE**` commands exercise the
  change directly rather than invoking the test framework.
- **Grounding method.** GROUNDING was performed inline with `Grep`/`Read` rather
  than by dispatching the research subagents, per the standing operator
  instruction in this session. Every `# SOURCE:` anchor is a verified
  `file:line`.
- **Why this phase adds no new validation check.** `gating-structure.mjs`'s own
  module comment states that a future opt-in methodology key "appends a new entry
  to the `SITES` array below instead of creating a new check module". Creating a
  23rd check here would contradict a design note the repository already wrote
  down. The advertised check count therefore stays at 22.
- **The blocked capability is the whole reason for the design.** A gate that
  scanned for docker-compose files or bound ports would be more convenient and
  would violate two things at once: the anti-pattern forbidding heuristic gating
  keys, and the out-of-scope list of the registered runnable-worktree-environments
  feature, which explicitly forbids modifying `implementer` or `test-runner` to
  assume a runnable environment exists. Declaring is not the cautious option
  here; it is the only one that does not contradict a recorded decision.

*Generated: 2026-09-02*
*Approved: 2026-09-02*
*Implemented: 2026-09-02*
*Status: IMPLEMENTED*
