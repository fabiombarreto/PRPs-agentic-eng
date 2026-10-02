# Feature: Secrecy foundation (Phase 1 of manual-qa-runner-auth-kit)

```
**Decision Gate**
- Active context: none
- Activated criteria: cross-cutting artifact creation (a secrecy contract every later phase of this feature consumes); new packaged resource and new script under `plugins/relay/`; impact on a shared contract (`redaction-policy.md`); secret handling; new `npm run validate` check
- Decisions found:
  - [2026-09-25] "Executing a QA report's cases, backed by a project-local test-auth kit under `PRPs/auth/`, is a registered future capability" — the binding scope of the source PRD; Phase 1 is its secrecy precondition
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/` — `PRPs/auth/` is the kit's root
  - [2026-04-19] Methodology declaration — no gating key is inferred; the secrecy procedure is unconditional and reads no opt-in key
  - [2026-09-25] "The hybrid `/code-review` pass affects a verdict only under four named conditions" — `hybrid-code-review` Phase 5 is `pending`; this phase must not touch the review loop (PRD AC-16)
- Applicable anti-patterns:
  - "Emitting secret values in run reports or logs" — the dominant risk of the feature; this phase extends the redaction policy and proves ignore rules before any secret write
  - "Writing pipeline artifacts under `.claude/`" — every path in this phase resolves under `PRPs/` or `plugins/relay/` or `scripts/`
  - "Treating `plugins/prp-core/` as active relay code" — nothing is imported from that tree
  - "Clearing an R-X match on anything other than the computed equivalence report" / R-X strict — the Implementer authors zero test files
- Applicable architectural rules:
  - PRP artifact paths — `PRPs/auth/` for the kit, `PRPs/reports/<feature>/` for run output
  - `${CLAUDE_PLUGIN_ROOT}` resolves only inside `plugins/relay/`; the packaged ignore resource therefore ships there and is resolved from the script's own location
  - Diff-base contract — changed-file sets use the single-argument `git diff <base>`, never `git diff <base>..HEAD`
  - Interactivity boundary — this phase adds no command, agent or dialogue; nothing here is reachable from `/relay-execute`
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/manual-qa-runner-auth-kit.prd.md` — Implementation Phases row 1: "Secrecy foundation" — Goal: make it impossible to write a secret before the ignore rules are proven. — Success signal: a deliberately unignorable path makes the procedure halt without writing, and `npm run validate` fails on a broken secrecy split.

## Summary

Phase 1 delivers the secrecy foundation every later phase of the auth kit depends on, before any credential, session file or login script exists. It ships four things: a packaged ignore resource (`plugins/relay/resources/auth-kit.gitignore`) that encodes the `PRPs/auth/` tracked/ignored split; a zero-dependency Node script (`plugins/relay/scripts/auth-kit-secrecy.mjs`) that copies that resource into `PRPs/auth/.gitignore` and implements the `git check-ignore`-then-halt procedure (`FAILED_IGNORE_UNPROVEN`); an extension of `plugins/relay/resources/redaction-policy.md` covering credential stores, session files and storage-state paths; and one new `npm run validate` check (`auth-secrecy`) registered in `scripts/validate/index.mjs` that fails on a broken split. No command, no agent, no login script and no runner is added. The script never writes a secret itself: it writes only the tracked ignore file, then proves every secret path ignored, so a later phase's secret write is gated on its exit code.

## User Story

As the operator of relay's human validation gate
I want the test-auth kit's secret paths proven gitignored before anything secret is ever written
So that a credential, cookie or storage-state file cannot reach git history or a PR-bound report.

## Problem Statement

`/relay-qa-report` writes per-case manual steps that relay never executes, and the blocker is authentication: most cases need a logged-in user in a specific role, and relay cannot produce one. The kit that will produce those sessions handles credentials, and the prevailing market pattern (credentials in the prompt) is the opposite of what relay requires. Nothing in the repository today proves a path is ignored before a secret lands in it — no use of `git check-ignore` exists anywhere — and `.gitignore` alone is insufficient because it does not cover already-tracked files and committed secrets persist in history. Phase 1 narrows this to the precondition: make it structurally impossible to write a secret before the ignore rules are proven.

## Solution Statement

Encode the tracked/ignored split once, as a packaged resource copied into `PRPs/auth/` (the `usage-metrics.mjs` scaffold precedent, which never overwrites an existing file). Gate every future secret write on a deterministic script whose only success signal is `git check-ignore -q` exit 0 for each secret path; exit 1 (not ignored, including already-tracked) and exit 128 (git error, not a repository) are both "not proven" and halt by name without writing. Extend `redaction-policy.md` so evidence and reports treat the kit's artifacts as path-reference-only and redact their values. Pin the contract mechanically with a new validation check so a broken split fails `npm run validate` rather than surviving in prose.

## Metadata

| Key | Value |
|-----|-------|
| Type | New capability (packaged resource, script, policy extension, validation check) |
| Complexity | Medium |
| Systems Affected | `plugins/relay/resources/`, `plugins/relay/scripts/`, `scripts/validate/` |
| Dependencies | none (Phase 1 of 5; no `Depends`) |
| Estimated Tasks | 5 |
| Source PRD line ref | `PRPs/prds/manual-qa-runner-auth-kit.prd.md:207` (table row 1) and `:217-220` (Phase Details) |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `PRPs/prds/manual-qa-runner-auth-kit.prd.md` | 179-188, 217-220 | Architecture Notes (the `PRPs/auth/` tracked/ignored split, script CLI conventions, validation-suite extension) and the Phase 1 goal/scope/success signal |
| P0 | `plugins/relay/scripts/usage-metrics.mjs` | 1-29, 434-465 | JSDoc Usage header / CLI conventions and the scaffold-copy precedent (`SCAFFOLD`, `scaffoldOutDir`) Task 2 mirrors |
| P0 | `plugins/relay/resources/usage-metrics.gitignore` | 1-19 | The shipped packaged-ignore resource: rationale-comment shape and the parent-directory-exclusion trap |
| P0 | `plugins/relay/resources/redaction-policy.md` | 14-70 | Layer 1 structure; Task 3 adds a subsection after the value-regex table |
| P0 | `scripts/validate/index.mjs` | 19-79 | Import list and `CHECKS` array Task 5 appends to |
| P0 | `scripts/validate/checks/diff-base-form.mjs` | 33-141 | Pure `checkX` plus thin `runXCheck` wrapper shape Task 4 mirrors |
| P1 | `plugins/relay/scripts/executable-content-hash.mjs` | 494-507 | The only production `execFileSync('git', ['-C', repo, ...])` pattern; Task 2 must read the exit status instead of swallowing it |
| P1 | `scripts/validate/checks/validate-registry.test.mjs` | 300-375 | Structural constraint: every module exporting a `run*Check` must be imported and appear in `CHECKS`; read-only for this plan |
| P1 | `scripts/validate/checks/plugin-root-resolvable.mjs` | 1-68 | Rule R1: a bare citation of `redaction-policy.md` anywhere under `plugins/relay/` must carry the `${CLAUDE_PLUGIN_ROOT}/resources/` prefix |
| P2 | `.gitattributes` | 21 | `* text=auto eol=lf` — new files must be written with LF endings |

## Patterns to Mirror

```
# SOURCE: plugins/relay/scripts/usage-metrics.mjs:15-29
 * Usage:
 *   node <plugin-root>/scripts/usage-metrics.mjs materialize [--root <dir>] [--out <dir>] [--project <id>]
 *   node <plugin-root>/scripts/usage-metrics.mjs --dry-run   [--root <dir>] [--out <dir>] [--project <id>]
 *   node <plugin-root>/scripts/usage-metrics.mjs query       [--root <dir>] [--out <dir>]
 *   node <plugin-root>/scripts/usage-metrics.mjs --help
 *
 * The mode is mandatory. Unknown arguments, flags missing a value, or no mode
 * exit 2 without writing (see USAGE / parseArgs).
 *
 * No npm dependencies. Node >=18, ESM, synchronous node: builtins only.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, renameSync, statSync } from 'node:fs';
import { resolve, join, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
```
Copied by Task 2 (the JSDoc Usage header, mandatory mode, exit-2-on-bad-argument rule, ESM and no-dependency stance; the file also opens with `// @ts-check`).

```
# SOURCE: plugins/relay/scripts/usage-metrics.mjs:442-465
const SCAFFOLD = {
  '.gitattributes': 'usage-metrics.gitattributes',
  '.gitignore': 'usage-metrics.gitignore',
};

/**
 * Write each scaffold file into outDir when absent. An existing file is never
 * overwritten: a project may have customized it, and a regenerated default
 * would silently discard that. Content is normalized to literal '\n' so a
 * CRLF checkout of the plugin cannot leak into the target.
 * @param {string} outDir
 * @returns {string[]} names written
 */
export function scaffoldOutDir(outDir) {
  /** @type {string[]} */ const written = [];
  for (const [name, template] of Object.entries(SCAFFOLD)) {
    const dest = join(outDir, name);
    if (existsSync(dest)) continue;
    const src = new URL(`../resources/${template}`, import.meta.url);
    writeAtomic(dest, readFileSync(src, 'utf8').split('\r\n').join('\n'));
    written.push(name);
  }
  return written;
}
```
Copied by Task 2 (resolve the packaged resource from the module's own location, never overwrite an existing destination, normalize CRLF to LF; `writeAtomic` at `usage-metrics.mjs:428-432` is the tmp-then-rename helper to re-implement locally rather than import).

```
# SOURCE: plugins/relay/resources/usage-metrics.gitignore:1-19
# Defensive re-include for the usage-metrics shards.
#
# Why this is needed: a target repository carrying a blanket `*.tsv` or `*.csv`
# ignore — routine in data and ML projects — would otherwise track zero bytes
# here, silently voiding the entire tracked-by-default rationale that makes the
# artifact portable. The failure mode is invisible: materialization succeeds,
# the files exist locally, and a clone gets nothing.
#
# Why it works: the root .gitignore documents the trap that "git never descends
# into an excluded DIRECTORY, so a `!` re-include under `.claude/` or
# `PRPs/reports/` would silently do nothing". That trap applies only to a
# parent DIRECTORY exclusion. A filename-pattern rule such as `*.tsv` leaves
# this directory itself traversable, so git still reads this nested file and
# the re-inclusion below takes effect.

!*.tsv

# Materializer scratch: atomic writes land here briefly before the rename.
*.tsv.tmp
```
Copied by Task 1 (a packaged ignore resource opens with a rationale comment block, then the rules; note the parent-directory-exclusion trap — `credentials.*` with a `!credentials.example.*` re-include works because it is a filename pattern, not a directory exclusion).

```
# SOURCE: plugins/relay/scripts/executable-content-hash.mjs:494-507
function readAtRevision(repo, rev, path) {
  if (rev === 'WORKTREE') {
    const abs = join(repo, path);
    return existsSync(abs) ? readFileSync(abs, 'utf8') : null;
  }
  try {
    return execFileSync('git', ['-C', repo, 'show', `${rev}:${path}`], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch {
    return null;
  }
}
```
Copied by Task 2 (the `git -C <repo>` invocation shape only; the bare `catch { return null; }` conflates failure modes and is NOT copied — `git check-ignore` exit 1 versus 128 must be told apart, so Task 2 uses `spawnSync` and reads `status`).

```
# SOURCE: plugins/relay/resources/redaction-policy.md:49-68
### Value regex — well-known secret formats

Applied to every captured line regardless of env var context. Catches
secrets that leak outside env vars (hardcoded in config, printed by
libraries, etc.).

| Source | Pattern |
|--------|---------|
| AWS Access Key | `AKIA[0-9A-Z]{16}` |
| Stripe live | `sk_live_[A-Za-z0-9]{24,}` |
| Stripe test | `sk_test_[A-Za-z0-9]{24,}` |
| GitHub classic PAT | `ghp_[A-Za-z0-9]{36}` |
| GitHub fine-grained PAT | `github_pat_[A-Za-z0-9_]{82}` |
| JWT | `eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+` |
| PEM private key header | `-----BEGIN [A-Z ]+PRIVATE KEY-----` |
| OpenAI API key | `sk-[A-Za-z0-9]{48}` |
| Anthropic API key | `sk-ant-[A-Za-z0-9_-]{95,}` |
| Google API key | `AIza[0-9A-Za-z_-]{35}` |
| Google OAuth2 access token | `ya29\.[A-Za-z0-9_-]{10,}` |
| Google OAuth2 client secret | `GOCSPX-[A-Za-z0-9_-]{28,}` |
```
Copied by Task 3 (a `###` subsection under Layer 1 introduced by a short rationale paragraph; the new subsection is inserted after this table, before the `---` that precedes Layer 2).

```
# SOURCE: scripts/validate/checks/diff-base-form.mjs:33-36
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const CHECK_NAME = 'diff-base-form';
```
Copied by Task 4 (imports, `CHECK_NAME` constant; the pure function returns `{ name: CHECK_NAME, ok, findings }` with `findings` entries of `{ message, file, line }`).

```
# SOURCE: scripts/validate/checks/diff-base-form.mjs:113-141
export function runDiffBaseFormCheck() {
  /** @type {Record<string, string | null>} */
  const files = {};

  for (const dir of SCAN_DIRS) {
    const abs = resolve(dir);
    if (!existsSync(abs)) {
      files[dir] = null;
      continue;
    }
    let names = [];
    try {
      names = readdirSync(abs).filter((n) => n.endsWith('.md'));
    } catch {
      files[dir] = null;
      continue;
    }
    for (const name of names) {
      const rel = join(dir, name).split('\\').join('/');
      try {
        files[rel] = readFileSync(resolve(rel), 'utf-8');
      } catch {
        files[rel] = null;
      }
    }
  }

  return checkDiffBaseForm({ files });
}
```
Copied by Task 4 (thin zero-arg `run*Check` wrapper that does all I/O relative to the process cwd and delegates to a pure function; an unreadable input is a returned finding, never a throw and never a silent pass).

```
# SOURCE: scripts/validate/index.mjs:43 and scripts/validate/index.mjs:77-79
import { runHybridDriftGateCheck } from './checks/hybrid-drift-gate.mjs';
...
  runLaneFixtureCheck,
  runHybridDriftGateCheck,
];
```
Copied by Task 5 (one import line appended after the last import at line 43, one `CHECKS` entry appended after `runHybridDriftGateCheck`).

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/resources/auth-kit.gitignore` | CREATE | the packaged ignore resource encoding the `PRPs/auth/` tracked/ignored split (Task 1) |
| `plugins/relay/scripts/auth-kit-secrecy.mjs` | CREATE | scaffold copy into `PRPs/auth/.gitignore` and the `git check-ignore`-then-halt procedure, `FAILED_IGNORE_UNPROVEN` (Task 2) |
| `plugins/relay/resources/redaction-policy.md` | UPDATE | cover credential stores, session files and storage-state paths (Task 3) |
| `scripts/validate/checks/auth-secrecy.mjs` | CREATE | new zero-arg `runAuthSecrecyCheck()` pinning the split, the halt code and the policy coverage (Task 4) |
| `scripts/validate/index.mjs` | UPDATE | import and register the new check in `CHECKS` (Task 5) |

## NOT Building (Scope Limits)

- No `/relay-auth-setup` command, no `auth-model-writer`/`auth-model-reviewer` agent, no `auth-model.md` template (Phase 2).
- No login script template, storage-state or token producer, idempotency or expiry logic, headed fallback, or `design-spec-template.md` repoint (Phase 3).
- No `/relay-qa-run` command, driver, outcome vocabulary or `results.json` (Phase 4).
- No local-only guard (`FAILED_NON_LOCAL_TARGET`) — it is a precondition of each network-touching phase, and Phase 1 touches no network.
- No file is created under this repository's own `PRPs/auth/`; the procedure is exercised only in throwaway temp repositories.
- Any change to `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, or `plugins/relay/commands/relay-implement.md` (PRD AC-16 asserts all three stay byte-identical).
- No change to `capture.mjs`, `/relay-qa-report`, or the `auth_mode` contract.
- No test file is authored by any task below: unit tests for the new script and the new check are routed through the `test-writer`/`test-reviewer` pair's lifecycle ledger (test-after mode; R-X strict).
- No edit to `docs/`, `documentation/` or the check count in `CLAUDE.md`; documentation sync for the new check is the implement-time `docs-updater`/`docs-reviewer` pass (`docs_sync: true`).

## Step-by-Step Tasks

### Task 1: CREATE plugins/relay/resources/auth-kit.gitignore

- **ACTION**: Create the packaged ignore resource, written with LF line endings. It opens with a rationale comment block in the style of `usage-metrics.gitignore` (why the split exists: Playwright storage-state and credential files can impersonate a test account; `.gitignore` alone is insufficient so `auth-kit-secrecy.mjs` proves each path with `git check-ignore`; the file is copied into `PRPs/auth/.gitignore`, so every rule is relative to `PRPs/auth/`). It then carries exactly these rules, in this order: `credentials.*`, then `!credentials.example.*`, then `.sessions/`, then `*.storage-state.json`, then `*.session.json`. `credentials.*` ignores the credential store in any format; the single re-include keeps the tracked placeholder file (`credentials.example.*`) tracked; `.sessions/` holds per-role session, storage-state and token artifacts; the last two rules catch a storage-state or session file written outside `.sessions/`. The tracked side — `auth-model.md`, the generated scripts, `credentials.example.*` and `.gitignore` itself — is deliberately not listed, so nothing else in `PRPs/auth/` is ignored. No other negation (`!`) line may appear and no blanket `*` rule may appear. Delivers AC-A2.
- **MIRROR**: `# SOURCE: plugins/relay/resources/usage-metrics.gitignore:1-19`
- **AC**: AC-A2 (PRD AC-5) — the split the later `git check-ignore` proof depends on.
- **VALIDATE**: `bash -euo pipefail -c 'R=$(mktemp -d); trap "rm -rf $R" EXIT; git -C "$R" init -q; mkdir -p "$R/PRPs/auth"; cp plugins/relay/resources/auth-kit.gitignore "$R/PRPs/auth/.gitignore"; git -C "$R" check-ignore -q -- PRPs/auth/credentials.json; git -C "$R" check-ignore -q -- PRPs/auth/.sessions/admin.json; git -C "$R" check-ignore -q -- PRPs/auth/admin.storage-state.json; git -C "$R" check-ignore -q -- PRPs/auth/admin.session.json; if git -C "$R" check-ignore -q -- PRPs/auth/credentials.example.json; then echo "FAIL: credentials.example.json is ignored"; exit 1; fi; if git -C "$R" check-ignore -q -- PRPs/auth/auth-model.md; then echo "FAIL: auth-model.md is ignored"; exit 1; fi; echo "PASS: tracked/ignored split proven by git check-ignore"'` (on the unmodified tree the `cp` fails because the resource does not exist; after the task every secret path is proven ignored and both tracked paths are proven not ignored by real `git check-ignore` exit codes).

### Task 2: CREATE plugins/relay/scripts/auth-kit-secrecy.mjs

- **ACTION**: Create the script: `// @ts-check`, a JSDoc header with a `Usage:` section, ESM, `node:` builtins only (`node:fs`, `node:path`, `node:url`, `node:child_process`), LF endings. The header cites the packaged resource only as `${CLAUDE_PLUGIN_ROOT}/resources/auth-kit.gitignore`, and does not name `redaction-policy.md` at all (a bare citation would trip `plugin-root-resolvable` rule R1). CLI: `node <plugin-root>/scripts/auth-kit-secrecy.mjs <mode> [--root <dir>] [--path <relative-path>]...` with modes `scaffold`, `prove`, `ensure`, plus `--help` (prints usage, exit 0). The mode is mandatory; an unknown mode, an unknown flag, a flag missing its value, no mode, an absolute `--path`, or a `--path` containing a `..` segment exits 2 without writing. `--root` defaults to `process.cwd()`; `--path` is repeatable, values are normalized to forward slashes, and when none is given the default secret-path set is `PRPs/auth/credentials.json`, `PRPs/auth/.sessions/_probe.json`, `PRPs/auth/_probe.storage-state.json` (exported as `SECRET_PATHS`). Behavior: `scaffold` creates `<root>/PRPs/auth/` if absent and copies the packaged resource, resolved with `new URL('../resources/auth-kit.gitignore', import.meta.url)`, to `<root>/PRPs/auth/.gitignore` only when that file is absent (never overwrite), normalizing CRLF to LF and writing via a local tmp-then-rename `writeAtomic`; it writes nothing else. `prove` writes nothing: for each path it runs `spawnSync('git', ['-C', root, 'check-ignore', '-q', '--', path], { encoding: 'utf8' })` and classifies the result by `status` — `0` is `ignored`, `1` is `not-ignored` (this includes an already-tracked path, because `--no-index` is deliberately NOT passed), anything else including a spawn error is `git-error`. Only `ignored` for every path is proof. On success it prints `IGNORE_PROVEN: <n> path(s)` to stdout and exits 0; otherwise it prints `FAILED_IGNORE_UNPROVEN: <n> secret path(s) not proven ignored: <path> (<status>), ...` to stderr and exits 1. `ensure` is the gate later phases call before any secret write: it first confirms `git -C <root> rev-parse --is-inside-work-tree` exits 0 printing `true` (otherwise it halts with `FAILED_IGNORE_UNPROVEN` before writing anything, leaving `<root>/PRPs` uncreated), then runs `scaffold`, then `prove`; exit 0 means a secret write may proceed, exit 1 means it must not. Export `SECRET_PATHS`, `scaffoldAuthDir(root)`, `proveIgnored(root, paths)` (returns `{ ok, results: [{ path, status }] }`) and `ensureSecrecy(root, paths)`, and run `main` only when the module is the entry point (`pathToFileURL(process.argv[1]).href === import.meta.url`). The script never reads, prints or writes any credential value. Delivers AC-A1.
- **MIRROR**: `# SOURCE: plugins/relay/scripts/usage-metrics.mjs:15-29` (header, CLI conventions), `# SOURCE: plugins/relay/scripts/usage-metrics.mjs:442-465` (scaffold copy, never overwrite, CRLF normalization), `# SOURCE: plugins/relay/scripts/executable-content-hash.mjs:494-507` (`git -C <repo>` invocation shape, with the exit status read rather than swallowed)
- **AC**: AC-A1 (PRD AC-5) — the proof-then-halt procedure; `FAILED_IGNORE_UNPROVEN` without writing any secret.
- **VALIDATE**: `bash -euo pipefail -c 'S=plugins/relay/scripts/auth-kit-secrecy.mjs; R=$(mktemp -d); N=$(mktemp -d); C=$(mktemp -d); trap "rm -rf $R $N $C" EXIT; git -C "$R" init -q; git -C "$C" init -q; node "$S" --help >/dev/null; rc=0; node "$S" ensure --root "$R" --bogus >/dev/null 2>&1 || rc=$?; [ "$rc" -eq 2 ]; rc=0; node "$S" >/dev/null 2>&1 || rc=$?; [ "$rc" -eq 2 ]; node "$S" ensure --root "$R" >/dev/null; test -f "$R/PRPs/auth/.gitignore"; rc=0; node "$S" prove --root "$R" --path PRPs/auth/auth-model.md >/dev/null 2>"$R/err.txt" || rc=$?; [ "$rc" -eq 1 ]; grep -qF "FAILED_IGNORE_UNPROVEN" "$R/err.txt"; rc=0; node "$S" ensure --root "$N" >/dev/null 2>"$N/err.txt" || rc=$?; [ "$rc" -eq 1 ]; grep -qF "FAILED_IGNORE_UNPROVEN" "$N/err.txt"; test ! -e "$N/PRPs"; mkdir -p "$C/PRPs/auth"; echo "# emptied" > "$C/PRPs/auth/.gitignore"; rc=0; node "$S" ensure --root "$C" >/dev/null 2>&1 || rc=$?; [ "$rc" -eq 1 ]; [ "$(find "$C/PRPs/auth" -type f | wc -l)" -eq 1 ]; echo "PASS: procedure halts on an unignorable path, a non-repository and a stripped ignore file, and writes no secret"'` (on the unmodified tree the first `node` call fails because the script does not exist; after the task the clean repo proves, the deliberately unignorable tracked path `PRPs/auth/auth-model.md` halts with exit 1 and the named code, the non-repository halts before creating `PRPs`, and the customized empty `.gitignore` halts with only that one file present).

### Task 3: UPDATE plugins/relay/resources/redaction-policy.md

- **ACTION**: Insert a new subsection under Layer 1, after the value-regex table and before the `---` that precedes `## Layer 2`, with this exact heading line: `### Credential stores, session files and storage-state paths`. The body states, in prose and short bullets: (1) the test-auth kit's artifacts are referenced by path only — the paths `PRPs/auth/credentials.*` (except the tracked placeholder `credentials.example.*`), `PRPs/auth/.sessions/` and any `*.storage-state.json` or `*.session.json` file are never read into an agent's context, never quoted, and never embedded in a report; only the path is written, so the contract phrase `referenced by path only` must appear verbatim. (2) When such a file's content is encountered anyway (an evidence artifact, a captured log, a response body), its values are redacted wholesale as `[REDACTED]`: every cookie `value`, every `localStorage` entry value of a Playwright storage-state file (its top-level keys are `cookies` and `origins`), every `password` or `token` field, and the values of the `Cookie`, `Set-Cookie` and `Authorization` headers — the literal header name `Set-Cookie` must appear. (3) The rule applies equally to evidence written by later phases of the auth kit and to Test Runner output, because a transcript, a prompt and a log are all leak surfaces. (4) Path presence is informative and is not redacted: a report may name a session file's path, and `git check-ignore` output may be shown, but never the file's content. Do not add rows to the value-regex table, do not add wildcards to the Layer 1 env-var lists, and do not cite any other plugin resource by basename. Delivers AC-A3.
- **MIRROR**: `# SOURCE: plugins/relay/resources/redaction-policy.md:49-68`
- **AC**: AC-A3 (PRD AC-6, AC-15) — credential values never reach context or reports; redaction applies to evidence.
- **VALIDATE**: `bash -euo pipefail -c 'P=plugins/relay/resources/redaction-policy.md; grep -qF "### Credential stores, session files and storage-state paths" "$P"; grep -qF "referenced by path only" "$P"; grep -qF "PRPs/auth/.sessions/" "$P"; grep -qF "Set-Cookie" "$P"; grep -qF "*.storage-state.json" "$P"; echo "PASS: redaction policy covers credential stores, session files and storage-state paths"'` (each literal is copied byte-for-byte from this task's ACTION; the deliverable is policy prose, so a text match is the legitimate check, and Task 4's check plus Level 1 exercise the same literals end-to-end).

### Task 4: CREATE scripts/validate/checks/auth-secrecy.mjs

- **ACTION**: Create the check module with LF endings: `#!/usr/bin/env node`, `// @ts-check`, a JSDoc header, `const CHECK_NAME = 'auth-secrecy';`, and two exports. `checkAuthSecrecy({ ignoreText, scriptText, policyText })` is pure (no I/O) and returns `{ name: CHECK_NAME, ok, findings }` where each finding is `{ message, file, line }`; a `null` or `undefined` text is a finding `missing or unreadable file: <path>`, never a throw. It asserts: (a) the non-comment, non-blank, trimmed lines of `ignoreText` include each of `credentials.*`, `.sessions/`, `*.storage-state.json` and `*.session.json`; (b) they include `!credentials.example.*` AND it appears after `credentials.*`; (c) no other line starts with `!`, and no line is exactly `*` or `/*` (a blanket ignore would hide the tracked side); (d) `scriptText` contains both `FAILED_IGNORE_UNPROVEN` and `check-ignore`; (e) `policyText` contains `### Credential stores, session files and storage-state paths`, `Set-Cookie` and `PRPs/auth/.sessions/`. `runAuthSecrecyCheck()` is a zero-arg wrapper that reads, relative to the process cwd, `plugins/relay/resources/auth-kit.gitignore`, `plugins/relay/scripts/auth-kit-secrecy.mjs` and `plugins/relay/resources/redaction-policy.md` (a file that cannot be read is passed as `null`) and delegates. It is the only export matching `run*Check`. Delivers AC-A4.
- **MIRROR**: `# SOURCE: scripts/validate/checks/diff-base-form.mjs:33-36` (imports and `CHECK_NAME`), `# SOURCE: scripts/validate/checks/diff-base-form.mjs:113-141` (thin wrapper delegating to a pure function; unreadable input is a finding)
- **AC**: AC-A4 (PRD AC-5, AC-6) — `npm run validate` fails on a broken secrecy split.
- **VALIDATE**: `bash -euo pipefail -c 'node -e "import(\"./scripts/validate/checks/auth-secrecy.mjs\").then(async (m) => { const fs = await import(\"node:fs\"); const t = (p) => fs.readFileSync(p, \"utf8\"); const good = { ignoreText: t(\"plugins/relay/resources/auth-kit.gitignore\"), scriptText: t(\"plugins/relay/scripts/auth-kit-secrecy.mjs\"), policyText: t(\"plugins/relay/resources/redaction-policy.md\") }; const live = m.runAuthSecrecyCheck(); if (live.name !== \"auth-secrecy\" || !live.ok) { console.error(JSON.stringify(live.findings)); process.exit(1); } if (!m.checkAuthSecrecy(good).ok) { console.error(\"good inputs rejected\"); process.exit(1); } const broken = { ...good, ignoreText: good.ignoreText.split(\"\\n\").filter((l) => l.trim() !== \".sessions/\").join(\"\\n\") }; if (m.checkAuthSecrecy(broken).ok) { console.error(\"broken split not detected\"); process.exit(1); } }).catch((e) => { console.error(e); process.exit(1); })"'` (on the unmodified tree the dynamic import rejects and the `catch` exits 1; after the task the live tree passes and a copy of the ignore resource with its `.sessions/` rule deleted is rejected, which proves the check fails on a broken split rather than merely existing).

### Task 5: UPDATE scripts/validate/index.mjs

- **ACTION**: Add `import { runAuthSecrecyCheck } from './checks/auth-secrecy.mjs';` immediately after the existing last import (`runHybridDriftGateCheck`, line 43), and append `runAuthSecrecyCheck,` as the last entry of the `CHECKS` array, immediately after `runHybridDriftGateCheck,` (the array then registers 26 checks). Change nothing else in the file. Do not touch any file under `plugins/relay/agents/` or `plugins/relay/commands/`; in particular `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md` and `plugins/relay/commands/relay-implement.md` must remain byte-identical to `HEAD`. Delivers AC-A4 (registration) and AC-A5 (the review loop stays untouched).
- **MIRROR**: `# SOURCE: scripts/validate/index.mjs:43 and scripts/validate/index.mjs:77-79`
- **AC**: AC-A4 (PRD AC-5, AC-6) — registration is what makes the check run; AC-A5 (PRD AC-16) — the three review-loop files are unchanged.
- **VALIDATE**: `bash -euo pipefail -c 'node scripts/validate/index.mjs | grep -xF "[PASS] auth-secrecy" >/dev/null; git diff --quiet HEAD -- plugins/relay/agents/code-reviewer.md plugins/relay/agents/code-reviewer-semantic.md plugins/relay/commands/relay-implement.md; echo "PASS: auth-secrecy is registered and green, review-loop files byte-identical"'` (the `[PASS] auth-secrecy` line is the exact format `printResults` in `scripts/validate/index.mjs` emits: `[${status}] ${result.name}`; on the unmodified tree the line is absent so the first pipeline exits 1, and `pipefail` also fails it if any other registered check fails; `git diff --quiet HEAD -- <paths>` is the single-argument form and exits 1 if any of the three files differs).

## Validation Commands

**Level 1 STATIC_ANALYSIS**

```
set -euo pipefail
for f in plugins/relay/scripts/auth-kit-secrecy.mjs scripts/validate/checks/auth-secrecy.mjs scripts/validate/index.mjs; do
  node --check "$f"
done
node scripts/validate/index.mjs | grep -xF "[PASS] auth-secrecy" >/dev/null
```

**Level 2 CONTENT_INVARIANTS**

```
set -euo pipefail
test -f plugins/relay/resources/auth-kit.gitignore
test -f plugins/relay/scripts/auth-kit-secrecy.mjs
test -f scripts/validate/checks/auth-secrecy.mjs
if grep -lP "\r$" plugins/relay/resources/auth-kit.gitignore plugins/relay/scripts/auth-kit-secrecy.mjs scripts/validate/checks/auth-secrecy.mjs; then
  echo "FAIL: CRLF line endings in a new file"; exit 1
else
  echo "PASS: new files are LF-only"
fi
if [ -n "$(git status --porcelain -- PRPs/auth)" ]; then
  echo "FAIL: this phase must not create any file under this repository's PRPs/auth/"; exit 1
else
  echo "PASS: no file created under PRPs/auth/"
fi
git diff --quiet HEAD -- plugins/relay/agents/code-reviewer.md plugins/relay/agents/code-reviewer-semantic.md plugins/relay/commands/relay-implement.md
```

**Level 3 INTEGRATION**

```
set -euo pipefail
node scripts/validate/index.mjs | grep -xF "[PASS] auth-secrecy" >/dev/null
node --test "scripts/validate/**/*.test.mjs"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-5):** `auth-kit-secrecy.mjs ensure` (and `prove`) exits 1 with `FAILED_IGNORE_UNPROVEN` on stderr whenever any secret path is not proven ignored by `git check-ignore -q` exit 0 — a tracked-but-matching path, a path whose ignore rule is missing, or a root that is not a git work tree — and in every such case writes no secret file (the only file the procedure ever writes is the tracked `PRPs/auth/.gitignore`).
- **AC-A2 (PRD AC-5):** `plugins/relay/resources/auth-kit.gitignore`, copied to `PRPs/auth/.gitignore`, makes `credentials.json`, `.sessions/<role>.json`, `*.storage-state.json` and `*.session.json` ignored while `credentials.example.json` and `auth-model.md` remain not ignored; `scaffold` never overwrites an existing `PRPs/auth/.gitignore`.
- **AC-A3 (PRD AC-6, AC-15):** `plugins/relay/resources/redaction-policy.md` declares the kit's credential stores, session files and storage-state paths as `referenced by path only` and requires their values (cookie values, `localStorage` values, `password`/`token` fields, `Cookie`/`Set-Cookie`/`Authorization` header values) to be redacted in any evidence or report.
- **AC-A4 (PRD AC-5, AC-6):** `npm run validate` registers a new `auth-secrecy` check that passes on the shipped tree and fails when the ignore resource loses a required rule, gains an extra re-include or blanket rule, or when the halt code or policy coverage is removed.
- **AC-A5 (PRD AC-16):** `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md` and `plugins/relay/commands/relay-implement.md` are byte-identical to their pre-phase content.

R8b (PRD AC-N token check) applies in PRD mode: every AC above carries its `(PRD AC-N)` token.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| A credential value reaches an agent's context, a report or git despite the rules | M | High | Phase 1 makes the gate deterministic: `ensure` exits 0 only when every path is proven ignored by `git check-ignore` (exit 1 and 128 both halt), the policy makes the artifacts path-reference-only, and the new check pins both |
| `git check-ignore` semantics for a not-yet-existing path inside an ignored directory (`.sessions/<role>.json`) differ from assumption | M | Medium | Task 1 and Task 2 VALIDATEs run real `git check-ignore` against nonexistent paths in a throwaway repository; `--no-index` is deliberately not used so an already-tracked path reads as not proven and halts. The official docs do not spell this out (web research gap), so the empirical run is the evidence |
| A customized or stale `PRPs/auth/.gitignore` silently lacks a rule because `scaffold` never overwrites | M | High | `ensure` always runs `prove` after `scaffold`, so a missing rule halts instead of passing; Task 2's VALIDATE covers the stripped-file case |
| Extending `redaction-policy.md` breaks an existing content assertion in the test corpus | L | Medium | Level 3 runs the full `node --test "scripts/validate/**/*.test.mjs"` corpus; the subsection adds prose only and does not alter the value-regex table or env-var lists |
| New check module unregistered or registered twice, tripping `validate-registry.test.mjs` | L | Low | Task 5 adds exactly one import and one `CHECKS` entry; the registry test is a structural equality (derived counts), so no hardcoded total needs a bump |
| Line endings on Windows (CRLF) make a new file fail the `line-endings` check once tracked | L | Low | Tasks require LF output; Level 2 greps the new files for `\r` |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- **Test-file routing:** this phase's test-file creation and updates are
  routed through the `test-writer`/`test-reviewer` pair's lifecycle
  ledger (`/relay-write-test` → `/relay-test-write-review`), not authored
  by the Implementer — R-X is a blanket straight-fail on any test glob in
  the Implementer's diff. No task below and no `## Files to Change` row
  targets a test file, so this plan's `**VALIDATE**` commands exercise the
  change directly rather than invoking the test framework.
- Expected test-pair coverage (for `test-writer`): unit tests for `auth-kit-secrecy.mjs` (`proveIgnored` status classification, `scaffoldAuthDir` never-overwrite, `ensureSecrecy` halt without writing) and for `checkAuthSecrecy` (each finding class) map to AC-A1 through AC-A4.
- Hard boundary: PRD AC-16 requires `code-reviewer.md`, `code-reviewer-semantic.md` and `relay-implement.md` to stay byte-identical. No task in this plan edits them; if implementation appears to require it, stop and report instead.
- Diff-base: every diff guard in this plan uses the single-argument form `git diff <base>` (here `git diff --quiet HEAD -- <paths>`), never `git diff <base>..HEAD`. The `git diff --quiet HEAD` guard in Task 5 and Level 2 is a prohibition invariant: it passes before the phase by nature, but each block containing it also contains a command that fails on the unmodified tree.
- Test corpus invocation is the quoted glob `node --test "scripts/validate/**/*.test.mjs"`; a bare directory argument fails with `MODULE_NOT_FOUND`.
- Research gaps carried forward: `research-web` fetched only the official git and Playwright docs, and found nothing on redaction of credentials from reports; the Task 3 policy text is therefore relay's own convention, consistent with the PRD's cited Playwright guidance that storage-state files "may contain sensitive cookies and headers that could be used to impersonate you or your test account".

*Generated: 2026-09-30*
*Approved: 2026-09-30*
*Status: IMPLEMENTED*
