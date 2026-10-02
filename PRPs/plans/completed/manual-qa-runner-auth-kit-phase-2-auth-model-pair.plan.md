# Feature: Auth model pair (Phase 2 of manual-qa-runner-auth-kit)

```
**Decision Gate**
- Active context: none
- Activated criteria: creation of a new standalone command and a new writer/reviewer agent pair; new cross-cutting artifact (`PRPs/auth/auth-model.md`, consumed blindly by later phases); fourth extension of the interactivity boundary; secret handling (the kit's secrecy split); new packaged resource template
- Decisions found:
  - [2026-09-25] "Executing a QA report's cases, backed by a project-local test-auth kit under `PRPs/auth/`, is a registered future capability" — binding scope; Phase 2 delivers only the human-confirmed `auth-model.md`
  - [2026-07-23] Design Spec pair and [2026-07-27] `/relay-visual-approve` — the two precedents for extending the interactivity boundary inside a standalone command; `invocation_context: main | subagent` with `subagent` as the fail-safe default
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`
  - [2026-04-19] Methodology declaration — opt-in gating keys are read from `docs/context/methodology.md`, never inferred
  - [2026-05-06] / [2026-07-12] R-X strict — the Implementer authors zero test files; test files come only from the test pair
  - [2026-09-25] The hybrid `/code-review` pass is measured by `hybrid-code-review` Phase 5 — no task may touch `code-reviewer`, `code-reviewer-semantic` or `relay-implement` (PRD AC-16)
- Applicable anti-patterns:
  - "Emitting secret values in run reports or logs" — the writer and reviewer reference secret files by path only and never read them
  - "Writing pipeline artifacts under `.claude/`" — every artifact goes under `PRPs/`
  - "Relying on interactive permission prompts in the autonomous loop" — the command is standalone and never invoked by `/relay-execute`
  - "Mutating a target project's working tree from a review agent" — `auth-model-reviewer` owns only its own flip
  - "Activating the test pair by heuristic" — no gating key is inferred
  - "Treating `plugins/prp-core/` as active relay code" — nothing is imported from that tree
- Applicable architectural rules:
  - Interactivity boundary — extensions are permitted only inside standalone commands, never inside the autonomous loop
  - Command versus agent separation — the command owns mutations and preconditions; the agents own judgment
  - `${CLAUDE_PLUGIN_ROOT}` resolves only inside `plugins/relay/`; templates ship there and are cited with the full prefix
  - Graceful degradation is mandatory when a precondition is absent — except the local-only guard, which is a hard failure by design
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/manual-qa-runner-auth-kit.prd.md` — Implementation Phases row 2: "Auth model pair" — Goal: a human-confirmed, tracked description of how the project authenticates and authorizes — Success signal: an `APPROVED` `auth-model.md` naming the mechanisms, the login flow, the role/permission matrix, how a user with a given role is created locally, and what cannot be automated — with no script and no credential written before the human's explicit approval.

## Summary

This phase adds the standalone `/relay-auth-setup` command and the `auth-model-writer` / `auth-model-reviewer` agent pair, plus the `auth-model-template.md` resource both agents conform to. The command runs its preconditions (Decision Gate sources readable, local-only guard, the Phase 1 secrecy script proven, collision handling), adopts the writer inline to read the project's authentication and authorization code statically and write a DRAFT `PRPs/auth/auth-model.md`, then adopts the reviewer inline with `invocation_context: main`, which runs a seven-item rubric and — only after the rubric passes AND the user's own explicit affirmative reply — flips the file to `APPROVED`. The phase ends at `APPROVED`: no login script and no credential file is written by anything in this phase. Because the validation suite hand-registers reviewers and commands in `timestamp-contract`, the phase also registers the new reviewer and command there, and registers the command and agents on the documentation site so `registration-parity` stays green.

## User Story

As an operator running relay's human validation gate
I want a reviewed, tracked description of how my project authenticates and authorizes that I have explicitly approved
So that the login scripts generated later are built on a verified model instead of a guess, and no script or credential exists before I have approved it

## Problem Statement

`/relay-qa-report` writes, for every case, a risk level, the required state and a numbered manual step-by-step, and leaves each Manual status at `pending`. Nothing in relay executes those steps. The blocker is authentication: most cases need a logged-in user in a specific role, and relay cannot produce one. Phase 2 narrows this to the first prerequisite — a human-confirmed model of how the project authenticates and authorizes, which every later script and the runner consume blindly.

## Solution Statement

Mirror the Design Spec pair's shape. A standalone command with numbered preconditions and `FAILED_<REASON>` HALTs inline-adopts a writer (Read/Write/Edit/Glob/Grep only — no Bash, no network, so discovery is static by construction) and then a clockless reviewer (Read/Edit/Write) in `main` mode. The command, not an agent, owns the two side-effecting preconditions: the local-only guard and the call to `plugins/relay/scripts/auth-kit-secrecy.mjs ensure`. The writer never reads secret paths or `.env*` files, recording environment-variable names only. The template fixes the artifact's nine required sections so the reviewer's rubric has a single authoritative shape.

## Metadata

| Field | Value |
|-------|-------|
| Type | New feature (prompt assets plus one registry edit and documentation-site registration) |
| Complexity | Medium |
| Systems Affected | `plugins/relay/commands/`, `plugins/relay/agents/`, `plugins/relay/resources/`, `scripts/validate/checks/timestamp-contract.mjs`, `documentation/assets/data/search-index.json`, `documentation/changelog.html` |
| Dependencies | Phase 1 (complete): `plugins/relay/scripts/auth-kit-secrecy.mjs`, `plugins/relay/resources/auth-kit.gitignore`, the `auth-secrecy` validation check |
| Estimated Tasks | 6 |
| Source PRD line ref | `PRPs/prds/manual-qa-runner-auth-kit.prd.md` lines 208 (row 2), 222-225 (Phase 2 details), 81-99 (ACs) |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `PRPs/prds/manual-qa-runner-auth-kit.prd.md` | 83-99, 179-188, 222-225 | AC-1, AC-5, AC-6, AC-9, AC-16; the interactivity-boundary and local-only-guard rules; Phase 2 scope and success signal |
| P0 | `plugins/relay/commands/relay-visual-approve.md` | 1-16, 27-64, 122-159 | Standalone command body order, Decision Gate block, usage HALT, byte-exact P4 HALT, explicit-confirmation discipline |
| P0 | `plugins/relay/commands/relay-design-spec.md` | 115-132, 211-263, 332-349 | `FAILED_*` precondition HALT shape, inline reviewer adoption with `date -u` capture and `review_started_at`, bounded-exhaustion offer, constraints list |
| P0 | `plugins/relay/agents/design-spec-reviewer.md` | 1-7, 28-46, 61-127, 259-350, 379-395 | Frontmatter, `invocation_context` flip ownership, inputs, hard constraints, branch-on-result, Step 4 flip, clockless timestamp-discipline section |
| P0 | `plugins/relay/agents/design-spec-writer.md` | 1-7, 41-77 | Writer frontmatter, inputs, hard constraints incl. `FAILED_TEMPLATE_UNREADABLE` |
| P0 | `plugins/relay/resources/design-spec-template.md` | 1-43 | Template file shape (purpose, provenance, authoritative-file, output path) |
| P0 | `plugins/relay/scripts/auth-kit-secrecy.mjs` | 11-21 | The exact modes, exit codes and the `ensure` gate the command must call rather than reimplement |
| P0 | `scripts/validate/checks/timestamp-contract.mjs` | 70-104, 203-267 | REVIEWERS / COMMANDS registries and the prose assertions a new reviewer and command must satisfy |
| P1 | `scripts/validate/checks/registration-parity.mjs` | 45-104 | New command must appear as `/relay-auth-setup` in search-index and changelog text; a mention of a command with no file is a stale finding |
| P1 | `plugins/relay/resources/redaction-policy.md` | 70-89 | Credential-store / session-file / storage-state rules the agents must not contradict |
| P1 | `documentation/changelog.html` | 31-42 | Unreleased block where the Added entry goes |
| P1 | `documentation/assets/data/search-index.json` | 92-103 | Commands and Agents excerpts that get the new names appended |

## Patterns to Mirror

```
# SOURCE: plugins/relay/commands/relay-visual-approve.md:1-4
---
description: 'Deterministic infra command (...). Never invoked by /relay-execute.'
argument-hint: <feature-name>
---
```
Copied by Task 4 (command frontmatter: single-line `description` plus `argument-hint`, no `name`).

```
# SOURCE: plugins/relay/commands/relay-visual-approve.md:130-135
If any is missing, HALT with the byte-exact pattern shared by every relay command:

> I cannot emit the Decision Gate evidence block without reading
> `<missing-file>`. Please ensure the file exists at
> `<target_root>/<relative-path>` and re-run /relay-visual-approve.
> No decision has been recorded and no halt.json has been modified.
```
Copied by Task 4 (Decision-Gate-unreadable HALT).

```
# SOURCE: plugins/relay/commands/relay-design-spec.md:126-132
> FAILED_FIGMA_TRACK_NOT_ACTIVE: `figma_track` is not `true` in
> `docs/context/methodology.md` for this project. `/relay-design-spec`
> requires the Figma Implementation Track to already be active.
> ... `/relay-design-spec` never activates the
> track itself and never infers activation by heuristic.
```
Copied by Task 4 (shape of a named `FAILED_<REASON>` precondition HALT blockquote).

```
# SOURCE: plugins/relay/commands/relay-design-spec.md:213-233
Capture the dispatch instant immediately before adopting the
Reviewer role: `date -u +%Y-%m-%dT%H:%M:%SZ`.
...
- `review_started_at`: the instant captured immediately above.
- `invocation_context: main`. You adopt the Reviewer protocol *inside
  this command's main conversation*, so the user's messages reach the
  Reviewer directly. ... This is
  the ONLY place the flip happens in a `/relay-design-spec` session —
  do not delegate it elsewhere.
```
Copied by Task 4 (Phase B reviewer adoption and timestamp capture).

```
# SOURCE: plugins/relay/agents/design-spec-reviewer.md:32-46
- **`main` mode** — your protocol is adopted directly in the main
  conversation (as `/relay-design-spec` does). ...
- **`subagent` mode** — you were dispatched via `Task`. ... you run the full rubric and return
  `RUBRIC_PASSED` (or `CHANGES_REQUESTED`) — you NEVER flip. ...

**Default context is `subagent`** (fail-safe: never auto-flip unless
an invoker with genuine user contact explicitly declares `main`).
```
Copied by Task 3 (flip ownership and fail-safe default).

```
# SOURCE: plugins/relay/agents/design-spec-reviewer.md:379-395
### Timestamp discipline (mandatory)

The `timestamp` field in the jsonl verdict below MUST be
`review_started_at` written through verbatim, in the exact format
`YYYY-MM-DDTHH:MM:SSZ` — a full UTC instant, never a date-only value
and never midnight. `2026-07-31T00:00:00Z` is an explicit example of
an unacceptable value: ...

If `review_started_at` was not supplied by the calling command,
append the verdict anyway — never drop an audit line — and add
`"timestamp_degraded": true` to that same JSON object so the gap is
visible in the corpus rather than silent.
```
Copied by Task 3 (clockless reviewer timestamp section; the section must contain no `date -u` and must not contain another `### ` heading).

```
# SOURCE: plugins/relay/agents/design-spec-writer.md:64-72
1. **Template conformance is non-negotiable.** Every DRAFT must match
   the section order and required sections of
   `${CLAUDE_PLUGIN_ROOT}/resources/design-spec-template.md`.
   Missing section = bug. If the `Read` of the template itself fails —
   missing, unreadable, or empty — halt immediately with
   `FAILED_TEMPLATE_UNREADABLE`, naming the attempted path, ...
```
Copied by Task 2 (writer hard constraint 1).

```
# SOURCE: plugins/relay/resources/design-spec-template.md:30-32
## Output path

`PRPs/designs/<feature>/design-spec.md`
```
Copied by Task 1 (template `## Output path` section).

```
# SOURCE: scripts/validate/checks/timestamp-contract.mjs:78-86
const REVIEWERS = [
  'plugins/relay/agents/code-reviewer.md',
  ...
  'plugins/relay/agents/design-spec-reviewer.md',
];
```
Copied by Task 5 (append a registry entry; never replace).

```
# SOURCE: plugins/relay/scripts/auth-kit-secrecy.mjs:11-21
 *   node <plugin-root>/scripts/auth-kit-secrecy.mjs ensure   [--root <dir>] [--path <relative-path>]...
 ...
 * Exit codes: 0 proven / done, 1 FAILED_IGNORE_UNPROVEN, 2 bad arguments.
 * `ensure` is the gate later phases call before any secret write.
```
Copied by Task 4 (the single call the command's secrecy precondition makes).

```
# SOURCE: plugins/relay/resources/redaction-policy.md:76-80
- **Referenced by path only.** `PRPs/auth/credentials.*` (except the tracked
  placeholder `credentials.example.*`), `PRPs/auth/.sessions/` and any
  `*.storage-state.json` or `*.session.json` file are never read into an
  agent's context, never quoted, and never embedded in a report. Only the path
  is written.
```
Copied by Tasks 2 and 3 (path-only rule inside both agents' hard constraints).

```
# SOURCE: documentation/changelog.html:31-35
      <h2 id="unreleased">Unreleased</h2>

      <h3 id="unreleased-changed">Changed</h3>

      <ul>
```
Copied by Task 6 (an `Added` block is inserted above the existing `Changed` block, same markup).

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/resources/auth-model-template.md` | CREATE | Single authoritative shape of `PRPs/auth/auth-model.md`; both agents conform to it |
| `plugins/relay/agents/auth-model-writer.md` | CREATE | Writer half of the pair: static discovery of the project's auth and authorization code into a DRAFT |
| `plugins/relay/agents/auth-model-reviewer.md` | CREATE | Reviewer half: seven-item rubric, `invocation_context` flip ownership, clockless timestamp discipline |
| `plugins/relay/commands/relay-auth-setup.md` | CREATE | Standalone command: preconditions, local-only guard, secrecy `ensure` call, inline adoption of both roles |
| `scripts/validate/checks/timestamp-contract.mjs` | UPDATE | Hand-registry: append the new reviewer to `REVIEWERS` and the new command to `COMMANDS` so the contract gates them |
| `documentation/assets/data/search-index.json` | UPDATE | `registration-parity` requires the command literal and each agent name in the search index |
| `documentation/changelog.html` | UPDATE | `registration-parity` requires them in the changelog text; `documentation/AGENTS.md` §7.4 requires an entry for every `documentation/` change |

## NOT Building (Scope Limits)

- Any login script, script template, credential file, session file or storage-state file — Phase 3; nothing in this phase writes one (PRD AC-9)
- `/relay-qa-run`, the runner, `results.json`, evidence capture — Phase 4
- Any change to `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md` or `plugins/relay/commands/relay-implement.md` (PRD AC-16)
- Any test file — the test pair owns them (R-X strict); no task or Files-to-Change row targets one
- Any change to `plugins/relay/scripts/auth-kit-secrecy.mjs`, `auth-kit.gitignore` or the `auth-secrecy` check — Phase 1 is complete; the command calls the script, it does not reimplement it
- A new `npm run validate` check enumerating local-only guard sites — the PRD registers that check for the script-bearing phases; this phase's guard is a command precondition only
- Editing `plugins/relay/commands/relay-qa-report.md`, `capture.mjs` or `design-spec-template.md` (the auth-mode repoint is Phase 3)
- Adding the new resource to `OWNED_RESOURCES` in `plugin-root-resolvable.mjs` — mirrors Phase 1, which did not register `auth-kit.gitignore`; that check's corpus may pin the list and corpus files are test-pair territory
- `docs/` knowledge-base edits, `documentation/reference/commands.html` / `agents.html` sections, a decisions entry for the fourth boundary extension, and a plugin version bump — docs-sync and the release step own those
- Any network request or app-running discovery — discovery is static Read/Glob/Grep only

## Step-by-Step Tasks

### Task 1: CREATE plugins/relay/resources/auth-model-template.md

**ACTION**: Delivers AC-A6. Create the template. Structure: an H1 `# Auth Model Template`; a purpose paragraph naming `auth-model-writer` and `auth-model-reviewer` as the two agents that reference it; a `**Keeping this file authoritative:**` paragraph (shape changes land here first, then propagate to both agents); `## Output path` stating `PRPs/auth/auth-model.md` (tracked; sibling `PRPs/auth/auth-model-review.jsonl` is the reviewer's append-only verdict log; NEVER write under `.claude/`); `## Secrecy rules` (credential values never appear in the file; secret files are cited by path only per `${CLAUDE_PLUGIN_ROOT}/resources/redaction-policy.md`; environment variables are recorded by NAME only; every host recorded is local); then a `## Skeleton` section holding the artifact shape with exactly these nine second-level headings, in this order: `## Authentication Mechanisms` (table: Mechanism, Used for, Evidence file:line), `## Login Flow` (numbered steps per mechanism, marking each scriptable or not), `## Session and Token Model` (cookie or token kind, lifetime, how expiry is detected, refresh; env-var names only), `## Role and Permission Matrix` (table: Role, Capabilities, Guard evidence file:line, Tenant scope), `## Tenant Scoping`, `## Local User Creation` (table: Role, Creation path — declared command, endpoint, seed, or manual — Evidence, Automatable yes/no), `## Non-Automatable Items` (SSO, MFA, captcha, email or SMS verification, each naming the affected roles), `## Local Targets` (base URLs, loopback or explicitly declared local hostnames only), `## Open Questions and Assumptions`. The skeleton ends with the two status lines `*Generated: <YYYY-MM-DD>*` and `*Status: DRAFT*`. Cite every packaged resource with the full `${CLAUDE_PLUGIN_ROOT}/resources/` prefix (plugin-root-resolvable R1). Write no credential-shaped example value; use `<placeholder>` tokens.
**MIRROR**: `# SOURCE: plugins/relay/resources/design-spec-template.md:30-32` (Output path section) and the header shape at design-spec-template.md:1-26 (see Mandatory Reading).
**VALIDATE**:
```bash
set -euo pipefail
node -e 'const t=require("fs").readFileSync("plugins/relay/resources/auth-model-template.md","utf8");const need=["# Auth Model Template","## Output path","PRPs/auth/auth-model.md","## Secrecy rules","## Skeleton","## Authentication Mechanisms","## Login Flow","## Session and Token Model","## Role and Permission Matrix","## Tenant Scoping","## Local User Creation","## Non-Automatable Items","## Local Targets","## Open Questions and Assumptions","*Status: DRAFT*"];const miss=need.filter(s=>!t.includes(s));if(miss.length){console.error("FAIL: template missing: "+miss.join(" | "));process.exit(1)}const order=need.slice(5,14).map(s=>t.indexOf(s));if(order.some((v,i)=>i>0&&v<order[i-1])){console.error("FAIL: the nine sections are out of order");process.exit(1)}console.log("PASS: template shape")'
```

### Task 2: CREATE plugins/relay/agents/auth-model-writer.md

**ACTION**: Delivers AC-A4 and AC-A6. Create the writer. Frontmatter: `name: auth-model-writer`, a double-quoted single-line `description` (static discovery of login endpoints, middleware and guards, session or token configuration, role and permission models and tenant scoping into a DRAFT conformant with the template; runs inline when adopted by `/relay-auth-setup`; never approves its own output — `auth-model-reviewer` owns the flip), `model: sonnet`, `color: orange`, and exactly `tools: Read, Write, Edit, Glob, Grep` (no Bash: discovery is static and performs no network request). Body: persona paragraph; `## Inputs (from the calling command)` (`target_root`, `auth_model_path`, `base_urls` — possibly empty, all pre-validated local by the command — and `local_hosts`); `## Hard constraints (read before anything else)`, numbered: (1) template conformance against `${CLAUDE_PLUGIN_ROOT}/resources/auth-model-template.md`, halting with `FAILED_TEMPLATE_UNREADABLE` naming the attempted path when the Read fails; (2) secret material is referenced by path only — never Read `PRPs/auth/credentials.*`, anything under `PRPs/auth/.sessions/`, any `*.storage-state.json` or `*.session.json`, private key files, or any `.env` file other than `.env.example`, `.env.sample` or `.env.template`; record an environment variable by NAME only and never quote a secret-looking value found in committed config; (3) no network and no running app — only Read, Glob, Grep over the repository; if any input host is not loopback or declared local, halt with `FAILED_NON_LOCAL_TARGET` without reading further; (4) no fabrication — every mechanism, role and guard cites a real `file:line` read in this run, and an unknown is written as `TBD - needs validation` or listed under `## Open Questions and Assumptions`, never guessed; (5) every role found in code appears in the matrix, and every mechanism that cannot be scripted (SSO, MFA, captcha, verification by email or SMS) appears under `## Non-Automatable Items`; (6) never overwrite an existing APPROVED file and never overwrite an existing DRAFT — use a numeric suffix; (7) you do NOT approve your own output and never write the `*Approved:` line; status lines end the file as `*Generated: <YYYY-MM-DD>*` then `*Status: DRAFT*`; (8) write only `auth_model_path` — never a script, never a credential file, never anything under `.claude/`. Include a discovery protocol section listing what to search (login routes and controllers, auth middleware and guards, session and token configuration, role and permission models, tenant scoping, seed and fixture and user-creation commands).
**MIRROR**: `# SOURCE: plugins/relay/agents/design-spec-writer.md:64-72` and `# SOURCE: plugins/relay/resources/redaction-policy.md:76-80`.
**VALIDATE**:
```bash
set -euo pipefail
node -e 'const t=require("fs").readFileSync("plugins/relay/agents/auth-model-writer.md","utf8");const need=["name: auth-model-writer","tools: Read, Write, Edit, Glob, Grep","${CLAUDE_PLUGIN_ROOT}/resources/auth-model-template.md","## Inputs (from the calling command)","## Hard constraints (read before anything else)","FAILED_TEMPLATE_UNREADABLE","FAILED_NON_LOCAL_TARGET","by path only",".env.example","You do NOT approve your own output","*Status: DRAFT*"];const miss=need.filter(s=>!t.includes(s));if(miss.length){console.error("FAIL: writer missing: "+miss.join(" | "));process.exit(1)}const tools=(t.match(/^tools:.*$/m)||[""])[0];if(/\bBash\b/.test(tools)){console.error("FAIL: writer must not have Bash");process.exit(1)}if(!t.startsWith("---\n")){console.error("FAIL: no frontmatter fence");process.exit(1)}console.log("PASS: writer contract")'
```

### Task 3: CREATE plugins/relay/agents/auth-model-reviewer.md

**ACTION**: Delivers AC-A3, AC-A4 and AC-A7. Create the reviewer. Frontmatter: `name: auth-model-reviewer`, a double-quoted single-line `description` (seven-item rubric; flip ownership scoped by `invocation_context`, default `subagent` fail-safe — the fourth place in relay where a reviewer dialogues with the user before flipping status; inline-adopted by `/relay-auth-setup` in `main` mode; never accepts caller-relayed consent), `model: sonnet`, `color: red`, and exactly `tools: Read, Edit, Write` (clockless, like `design-spec-reviewer`). Body mirrors `design-spec-reviewer`: persona; the `main` / `subagent` bullets ending `**Default context is \`subagent\`**`; `## Inputs (from the calling command)` with `auth_model_path`, `target_root`, `invocation_context` (absent or unrecognized means `subagent`) and `review_started_at`; `## Hard constraints` (flip only in `main` after rubric pass AND the user's own explicit affirmative reply; relayed or secondhand approval is never sufficient; re-validate the rubric immediately before the flip; no short-circuit; every verdict appends to `PRPs/auth/auth-model-review.jsonl`; flip is a two-line `Edit` — `*Status: DRAFT*` becomes `*Approved: <YYYY-MM-DD>*` then `*Status: APPROVED*` — BEFORE the jsonl append; never Read a secret path; write no script and no credential file). Then `## The seven-item rubric (R-AM1–R-AM7)`: R-AM1 every mechanism named with spot-verifiable `file:line` evidence; R-AM2 a login flow per mechanism, each marked scriptable or not; R-AM3 the role and permission matrix lists every role found in the evidence, each with guard evidence and tenant scope; R-AM4 `## Local User Creation` names, per role, a declared creation path or an explicit "none declared"; R-AM5 every non-scriptable item (SSO, MFA, captcha, email or SMS verification) is listed with its affected roles; R-AM6 no credential-shaped value (password literal, JWT, private-key header, cookie value) appears and every host in `## Local Targets` is loopback or explicitly declared local; R-AM7 no unresolved `TBD - needs validation` remains without a matching `## Open Questions and Assumptions` row. Then `## Protocol` Steps 1-5 (load and verify `*Status: DRAFT*`; run all seven; branch — `subagent` returns `RUBRIC_PASSED` with `flip_instructions` and never flips, `main` asks the user to approve; Step 4 final flip; Step 5 dialogue loop with narrow `Edit` fixes). Finish with the `auth-model-review.jsonl format` section containing a `### Timestamp discipline (mandatory)` subsection that: requires `timestamp` to be `review_started_at` verbatim in `YYYY-MM-DDTHH:MM:SSZ`; names `2026-07-31T00:00:00Z` as an explicit example of an unacceptable `T00:00:00` value; and, when `review_started_at` was not supplied, says to append anyway and add `"timestamp_degraded": true`. That subsection must contain no `date -u` text and no other `### ` heading before it ends.
**MIRROR**: `# SOURCE: plugins/relay/agents/design-spec-reviewer.md:32-46` and `# SOURCE: plugins/relay/agents/design-spec-reviewer.md:379-395`.
**VALIDATE**:
```bash
set -euo pipefail
node -e 'const t=require("fs").readFileSync("plugins/relay/agents/auth-model-reviewer.md","utf8");const ids=["R-AM1","R-AM2","R-AM3","R-AM4","R-AM5","R-AM6","R-AM7"];const need=["name: auth-model-reviewer","tools: Read, Edit, Write","invocation_context","review_started_at","RUBRIC_PASSED","**Default context is `subagent`**","PRPs/auth/auth-model-review.jsonl","### Timestamp discipline (mandatory)","T00:00:00","\"timestamp_degraded\": true","*Approved: <YYYY-MM-DD>*"].concat(ids);const miss=need.filter(s=>!t.includes(s));if(miss.length){console.error("FAIL: reviewer missing: "+miss.join(" | "));process.exit(1)}if(t.includes("date -u")){console.error("FAIL: clockless reviewer must not instruct date -u");process.exit(1)}const tools=(t.match(/^tools:.*$/m)||[""])[0];if(/\bBash\b/.test(tools)){console.error("FAIL: reviewer must be clockless");process.exit(1)}console.log("PASS: reviewer contract")'
```

### Task 4: CREATE plugins/relay/commands/relay-auth-setup.md

**ACTION**: Delivers AC-A1, AC-A2, AC-A3 and AC-A4. Create the command in the standalone body order. Frontmatter: single-line single-quoted `description` (fourth interactivity-boundary extension confined to this standalone command; inline-adopts `auth-model-writer` then `auth-model-reviewer` with `invocation_context: main`; produces an APPROVED `PRPs/auth/auth-model.md` and nothing else; never invoked by `/relay-execute`) and `argument-hint: [--base-url <local-url>] [--local-host <hostname>]...`. Then `# /relay-auth-setup`, `**Arguments:** $ARGUMENTS`, `## Your mission` (use the phrase "fourth interactivity-boundary extension"; state that this command writes no login script and no credential file, and that generating them is a later phase of this feature it does not perform), `See:` bullets using only `${CLAUDE_PLUGIN_ROOT}/...` paths (writer, reviewer, template, `scripts/auth-kit-secrecy.mjs`, `resources/redaction-policy.md`, `commands/relay-design-spec.md`), `## Decision Gate (before any action)` with the six-line block, and `## Parse arguments`: optional `--base-url <url>` and repeatable `--local-host <hostname>` (an explicit declaration of a local development hostname); any other argument HALTs with a usage blockquote. `## Preconditions`, run in this order: **P1 Decision Gate sources readable** — the byte-exact HALT shown under Patterns to Mirror, adapted with `/relay-auth-setup` and "No auth model has been written."; **P2 Local-only guard** — the host of `--base-url` (when given) must be `localhost`, `127.0.0.1`, `::1`, or exactly a `--local-host` name; otherwise HALT with a blockquote beginning `FAILED_NON_LOCAL_TARGET`, performing no read of the project, no write and no network request; state that this phase makes no network request at all and that the guard is a hard failure, never a warning; **P3 Secrecy proven before anything is written** — run, from a fenced bash block, exactly this line:
`node "${CLAUDE_PLUGIN_ROOT}/scripts/auth-kit-secrecy.mjs" ensure --root "<target_root>"`
and on any non-zero exit HALT with a blockquote beginning `FAILED_IGNORE_UNPROVEN` naming the script's stderr and stating that nothing further was written; **P4 Collision** — if `PRPs/auth/auth-model.md` ends with `*Status: APPROVED*`, HALT `FAILED_AUTH_MODEL_ALREADY_APPROVED` (manual hand-edit of the status line back to DRAFT is the documented escape hatch); if it is a DRAFT, skip Phase A and go straight to Phase B; if absent, run Phase A. `## Phase A — Adopt the Writer role`: follow `${CLAUDE_PLUGIN_ROOT}/agents/auth-model-writer.md` inline with `target_root`, `auth_model_path`, `base_urls`, `local_hosts`; surface any writer HALT verbatim and exit without adopting the reviewer. `## Phase B — Adopt the Reviewer role`: capture the instant with `date -u +%Y-%m-%dT%H:%M:%SZ`, follow `${CLAUDE_PLUGIN_ROOT}/agents/auth-model-reviewer.md` inline with `auth_model_path`, `target_root`, `review_started_at`, and `invocation_context: main`; include a bounded-exhaustion section `max_auth_model_review_retries = 2` offering retry-with-corrected-inputs or abort (DRAFT preserved) on a third `CHANGES_REQUESTED`, never a silent loop. `## Final output surface`: on APPROVED, the reviewer's summary followed by an explicit statement that no login script and no credential file has been written and that the human validation gate is unchanged. Close with `## Constraints (hard rules)` (nothing under `.claude/`; never flip without the user's own explicit affirmative reply; never `Task`-dispatch either role; "Never invoked by `/relay-execute`"; no network request; no credential value enters the conversation — secret files are referenced by path only; the only files written are `PRPs/auth/.gitignore` via the script, `PRPs/auth/auth-model.md` and `PRPs/auth/auth-model-review.jsonl`) and `## What you do NOT do`. Do not mention any command other than existing ones in any `Next:` line or prose.
**MIRROR**: `# SOURCE: plugins/relay/commands/relay-visual-approve.md:1-4`, `# SOURCE: plugins/relay/commands/relay-visual-approve.md:130-135`, `# SOURCE: plugins/relay/commands/relay-design-spec.md:126-132`, `# SOURCE: plugins/relay/commands/relay-design-spec.md:213-233`, `# SOURCE: plugins/relay/scripts/auth-kit-secrecy.mjs:11-21`.
**VALIDATE**:
```bash
set -euo pipefail
node -e 'const t=require("fs").readFileSync("plugins/relay/commands/relay-auth-setup.md","utf8");const need=["# /relay-auth-setup","argument-hint:","fourth interactivity-boundary extension","I cannot emit the Decision Gate evidence block without reading","FAILED_NON_LOCAL_TARGET","FAILED_IGNORE_UNPROVEN","FAILED_AUTH_MODEL_ALREADY_APPROVED","node \"${CLAUDE_PLUGIN_ROOT}/scripts/auth-kit-secrecy.mjs\" ensure --root \"<target_root>\"","date -u +%Y-%m-%dT%H:%M:%SZ","review_started_at","invocation_context: main","max_auth_model_review_retries","Never invoked by `/relay-execute`","## Phase A","## Phase B"];const miss=need.filter(s=>!t.includes(s));if(miss.length){console.error("FAIL: command missing: "+miss.join(" | "));process.exit(1)}if(t.includes("/relay-qa-run")){console.error("FAIL: must not mention the not-yet-existing /relay-qa-run");process.exit(1)}const i=(s)=>t.indexOf(s);if(!(i("FAILED_NON_LOCAL_TARGET")<i("auth-kit-secrecy.mjs\" ensure")&&i("auth-kit-secrecy.mjs\" ensure")<i("## Phase A")&&i("## Phase A")<i("## Phase B"))){console.error("FAIL: guard, then secrecy ensure, then Phase A, then Phase B ordering violated");process.exit(1)}console.log("PASS: command contract and ordering")'
```

### Task 5: UPDATE scripts/validate/checks/timestamp-contract.mjs

**ACTION**: Infrastructure/scaffolding annotation: delivers no acceptance criterion directly; it makes the contract gate the new reviewer and command. Append `'plugins/relay/agents/auth-model-reviewer.md',` as the last entry of the `REVIEWERS` array and `'plugins/relay/commands/relay-auth-setup.md',` as the last entry of the `COMMANDS` array. Adjust only the two adjacent JSDoc count phrases that state the registry sizes ("The seven jsonl-appending reviewers", "The eight dispatching commands") to eight and nine respectively. Never replace an existing entry; touch nothing else. Do not edit any test file — if a corpus test turns out to pin registry sizes, that is a test-pair EXISTING_TEST_UPDATED item, not an Implementer edit.
**MIRROR**: `# SOURCE: scripts/validate/checks/timestamp-contract.mjs:78-86`.
**VALIDATE**:
```bash
set -euo pipefail
node --input-type=module -e 'const {pathToFileURL}=await import("node:url");const m=await import(pathToFileURL(process.cwd()+"/scripts/validate/checks/timestamp-contract.mjs").href);const need=["plugins/relay/agents/auth-model-reviewer.md","plugins/relay/commands/relay-auth-setup.md"];const miss=need.filter(p=>!m.WATCHED_FILES.includes(p));if(miss.length){console.error("FAIL: not registered: "+miss.join(", "));process.exit(1)}const r=m.runTimestampContractCheck();if(!r.ok){console.error("FAIL: "+JSON.stringify(r.findings));process.exit(1)}console.log("PASS: registered and the contract holds for the new files")'
```

### Task 6: UPDATE documentation/assets/data/search-index.json and documentation/changelog.html

**ACTION**: Infrastructure/scaffolding annotation for registration; also delivers AC-A5 (review loop untouched — this task's VALIDATE is where the byte-identity guard runs). In `search-index.json`, append to the `Commands` entry's `excerpt` (it currently ends `never invoked by /relay-execute.`) one sentence introducing `/relay-auth-setup` as the standalone, human-triggered command that produces the human-approved `PRPs/auth/auth-model.md`, and to the `Agents` entry's `excerpt` (it currently ends `structured output.`) a sentence naming `auth-model-writer` and `auth-model-reviewer`. Keep the JSON valid, LF-only, ASCII-safe, and do not mention `/relay-qa-run` (a command mention with no command file is a stale `registration-parity` finding). In `changelog.html`, insert above the existing `<h3 id="unreleased-changed">Changed</h3>` a new `<h3 id="unreleased-added">Added</h3>` block with one `<li>` using the same markup as neighbouring entries (`<strong>` title, `&mdash;` separators, `<code>` for identifiers) describing `/relay-auth-setup`, `auth-model-writer`, `auth-model-reviewer`, the `auth-model-template.md` resource, and the explicit note that no script or credential is written in this phase. No emojis, no inline styles, per `documentation/AGENTS.md`.
**MIRROR**: `# SOURCE: documentation/changelog.html:31-35`.
**VALIDATE**:
```bash
set -euo pipefail
node --input-type=module -e 'import fs from "node:fs";const {pathToFileURL}=await import("node:url");const idx=JSON.parse(fs.readFileSync("documentation/assets/data/search-index.json","utf8"));const txt=JSON.stringify(idx);const cl=fs.readFileSync("documentation/changelog.html","utf8");const need=["/relay-auth-setup","auth-model-writer","auth-model-reviewer"];const miss=need.filter(s=>!txt.includes(s)||!cl.includes(s));if(miss.length){console.error("FAIL: not registered on the doc site: "+miss.join(", "));process.exit(1)}const m=await import(pathToFileURL(process.cwd()+"/scripts/validate/checks/registration-parity.mjs").href);const r=m.runRegistrationParityCheck();if(!r.ok){console.error("FAIL: "+JSON.stringify(r.findings));process.exit(1)}console.log("PASS: registration-parity green")'
git diff --quiet ff92a5d186b8bb9a9ecb9c8ec202b8bb936ae16c -- plugins/relay/agents/code-reviewer.md plugins/relay/agents/code-reviewer-semantic.md plugins/relay/commands/relay-implement.md
```

## Validation Commands

### Level 1 — STATIC_ANALYSIS

```bash
set -euo pipefail
npm run validate
```

Runs every registered static check (26 today, including `frontmatter-schema`, `registration-parity`, `path-existence`, `plugin-root-resolvable`, `dispatch-graph`, `timestamp-contract`, `line-endings`, `diff-base-form`, `auth-secrecy`); the runner sets a non-zero exit code when any check reports a finding. The count must stay 26 — this phase adds no check module.

### Level 2 — CONTENT_INVARIANTS and UNIT_TESTS

```bash
set -euo pipefail
BASE=ff92a5d186b8bb9a9ecb9c8ec202b8bb936ae16c
# AC-16: the review loop is byte-identical (single-argument tree form, never two-dot).
git diff --quiet "$BASE" -- plugins/relay/agents/code-reviewer.md plugins/relay/agents/code-reviewer-semantic.md plugins/relay/commands/relay-implement.md
# New files are untracked, so their whole content is the added text: scan them directly.
for f in plugins/relay/resources/auth-model-template.md plugins/relay/agents/auth-model-writer.md plugins/relay/agents/auth-model-reviewer.md plugins/relay/commands/relay-auth-setup.md; do
  if grep -n '\.claude/PRPs' "$f" | grep -qv 'MUST NOT appear'; then
    echo "FAIL: forbidden .claude/PRPs reference in $f outside a quoted prohibition"; exit 1
  fi
done
# Modified files: scan only the added diff lines, excluding the quoted-prohibition idiom.
if git diff --unified=0 "$BASE" -- scripts/validate/checks/timestamp-contract.mjs documentation/assets/data/search-index.json documentation/changelog.html | grep -E '^\+[^+]' | grep '\.claude/PRPs' | grep -qv 'MUST NOT appear'; then
  echo "FAIL: forbidden .claude/PRPs reference introduced in a modified file"; exit 1
fi
# The whole existing corpus still passes (quoted glob; a bare directory fails MODULE_NOT_FOUND).
node --test "scripts/validate/**/*.test.mjs"
```

The corpus baseline is 1054 tests and must stay green; the runner's own exit code carries the signal, so no reporter output is parsed.

### Level 3 — INTEGRATION (dry-run of the command's own secrecy precondition)

```bash
set -euo pipefail
node -e '
const fs=require("fs"),os=require("os"),path=require("path"),cp=require("child_process");
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"auth-setup-"));
const fail=(m)=>{console.error("FAIL: "+m);fs.rmSync(tmp,{recursive:true,force:true});process.exit(1)};
try{
  cp.execFileSync("git",["init","-q"],{cwd:tmp});
  const line=fs.readFileSync("plugins/relay/commands/relay-auth-setup.md","utf8").split("\n").find(x=>x.startsWith("node \"${CLAUDE_PLUGIN_ROOT}/scripts/auth-kit-secrecy.mjs\" ensure"));
  if(!line) fail("ensure invocation line not found in the command");
  const cmd=line.split("${CLAUDE_PLUGIN_ROOT}").join(path.resolve("plugins/relay")).replace("<target_root>",tmp);
  cp.execSync(cmd,{stdio:"inherit"});
  const files=[];
  const walk=(d)=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);e.isDirectory()?walk(p):files.push(path.relative(tmp,p).split(path.sep).join("/"))}};
  walk(path.join(tmp,"PRPs"));
  if(files.length!==1||files[0]!=="PRPs/auth/.gitignore") fail("expected only PRPs/auth/.gitignore to exist, found: "+files.join(","));
  const r=cp.spawnSync(process.execPath,[path.resolve("plugins/relay/scripts/auth-kit-secrecy.mjs"),"prove","--root",tmp,"--path","PRPs/auth/auth-model.md"],{encoding:"utf8"});
  if(r.status!==1) fail("the tracked auth-model.md path must NOT be ignorable (prove should exit 1, got "+r.status+")");
  fs.rmSync(tmp,{recursive:true,force:true});
  console.log("PASS: the command secrecy line runs as written, writes only the ignore file, and leaves auth-model.md tracked");
}catch(e){fail(e.message)}
'
```

The manual end-to-end (a real `/relay-auth-setup` session with a human reply) cannot be automated; it is the Phase 5 dogfood's job. The reply-gated flip is verified here structurally by Tasks 3 and 4.

## Acceptance Criteria

- **AC-A1 (PRD AC-1):** Given a `--base-url` whose host is not `localhost`, `127.0.0.1`, `::1` or a `--local-host` name, `/relay-auth-setup` refuses by name with `FAILED_NON_LOCAL_TARGET` before any read of the project, any write or any request — never a warning.
- **AC-A2 (PRD AC-5):** `/relay-auth-setup` runs `auth-kit-secrecy.mjs ensure` before anything else is written and HALTs with `FAILED_IGNORE_UNPROVEN` when it exits non-zero, leaving nothing further written.
- **AC-A3 (PRD AC-9):** Given a DRAFT `PRPs/auth/auth-model.md` whose rubric passes, the status stays `DRAFT` and no login script and no credential file exists until the user gives their own explicit affirmative reply; only then does `auth-model-reviewer` flip `DRAFT` to `APPROVED`.
- **AC-A4 (PRD AC-6):** The writer, the reviewer and the command reference credential stores, session files and storage-state files by path only; the writer never Reads them or any `.env` file other than an example file, and records environment variables by name only.
- **AC-A5 (PRD AC-16):** After the phase, `code-reviewer.md`, `code-reviewer-semantic.md` and `relay-implement.md` are byte-identical to their pre-phase content.
- **AC-A6 (PRD AC-9):** The template and the writer produce an `auth-model.md` with the nine required sections, naming the mechanisms, the login flow, the role and permission matrix, how a user with a given role is created locally, and what cannot be automated.
- **AC-A7 (PRD AC-9):** `auth-model-reviewer` takes `invocation_context: main | subagent` with `subagent` as the fail-safe default; in `subagent` mode it returns `RUBRIC_PASSED` and never flips, and a caller-relayed approval is never accepted as the user's.

R8b (PRD AC-N token check) is satisfied: every bullet above carries a PRD AC token.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| A credential value reaches the writer's context by reading an `.env` or session file | M | H | Hard constraint 2 forbids those reads by name; the writer has no Bash; reviewer R-AM6 fails any credential-shaped value in the DRAFT |
| `auth-model.md` is wrong and later phases build on it | M | H | Seven-item rubric with spot-verifiable `file:line` evidence, then the human's explicit approval; nothing is generated before `APPROVED` |
| The local-only guard lives only in command prose this phase and could be missed at a later site | M | M | Phase 1 and 3-4 own the script-side guards and the PRD's enumerating check; here the guard is P2 and R-AM6 re-checks the recorded hosts |
| Registering in `timestamp-contract` trips a corpus test that pins registry sizes | L | M | Level 2 runs the whole corpus; any such pin is resolved by the test pair (EXISTING_TEST_UPDATED), never by an Implementer test edit |
| New prompt files fail a hand-registered or pattern-based validation check (R1 basenames, frontmatter, `line-endings`) | M | M | Every resource citation carries the full `${CLAUDE_PLUGIN_ROOT}/resources/` prefix; frontmatter follows the schema; Level 1 runs all checks |
| A `/relay-qa-run` mention in documentation text creates a stale `registration-parity` finding | M | L | Tasks 4 and 6 forbid the mention; their VALIDATE commands check for it |
| Reusing an existing DRAFT skips the writer and a hand-edited DRAFT is reviewed as-is | L | L | Intended: the reviewer re-validates the rubric against the file on disk before any flip |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- **Test-file routing:** this phase's test-file creation and updates are routed through the `test-writer`/`test-reviewer` pair's lifecycle ledger (`/relay-write-test` → `/relay-test-write-review`), not authored by the Implementer — R-X is a blanket straight-fail on any test glob in the Implementer's diff. No task below and no `## Files to Change` row targets a test file, so this plan's `**VALIDATE**` commands exercise the change directly rather than invoking the test framework.
- **Plan decisions the PRD left open:** (1) the command accepts `--base-url` and repeatable `--local-host` so the PRD's "local development hostname the project explicitly declares" has a concrete declaration mechanism; (2) an existing DRAFT is reviewed rather than regenerated, and an APPROVED file HALTs; (3) the command stops at `APPROVED` and states plainly that script and credential generation belong to a later phase.
- **Bash in the command:** the command runs two Bash invocations (the secrecy script and `date -u`). It is standalone and human-present, so a permission prompt for them is acceptable; no `settings-allowlist` entry is added here.
- **Line endings:** every file written must be LF-only (`line-endings` check); the JSON edit must keep the file valid.
- **Diff base:** the tree object `ff92a5d186b8bb9a9ecb9c8ec202b8bb936ae16c` is this phase's base; only single-argument `git diff <base>` forms are used.
- **Working tree baseline:** Phase 1's work is uncommitted; `npm run validate` reports 26 checks and the corpus is 1054 tests — hold them.

*Generated: 2026-09-30*
*Approved: 2026-09-30*
*Status: IMPLEMENTED*
