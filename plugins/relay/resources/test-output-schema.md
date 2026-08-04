# Test output schema

Canonical JSON schema every test framework output is normalized into
before the Test Runner consumes it. Consumed by:

- **B3 Classifier** — reads `failures[].category` slot (populated by the
  classifier itself from initially-null) plus the rest of the record.
- **B4 Auto-correction loop** — reads `outcome`, `failures`, `counts`
  to decide whether to retry and what feedback to send to the
  Implementer.
- **B5 Post-green review** — compares pre/post records to detect test
  weakening.
- **B6 Report** — embeds the record into `final-report.md`.

Produced by `${CLAUDE_PLUGIN_ROOT}/scripts/normalize-test-output.mjs`,
which reads framework-native output (JUnit XML for pytest, Playwright,
Vitest, and node:test) plus optional coverage / trace paths, and emits
the schema below on stdout. Written in Node.js without npm dependencies
— Claude Code ships Node, so the script runs in every relay target
regardless of the target's own language stack.

---

## Schema v1

```json
{
  "run_id": "string (UUID generated per session; same id for all attempts in a run)",
  "attempt": 1,
  "tier": "unit | integration | e2e",
  "framework": "pytest | playwright | vitest | node:test",
  "outcome": "PASSED | FAILED | FAILED_AFTER_N_RETRIES | FAILED_TIME_BUDGET_EXCEEDED | SKIPPED_UPSTREAM_FAILURE",
  "duration_ms": 12345,
  "counts": {
    "passed": 142,
    "failed": 3,
    "skipped": 0,
    "total": 145
  },
  "failures": [
    {
      "suite": "AssessmentListPage",
      "test": "filters by institution",
      "file": "frontend/tests/e2e/assessment-list.spec.ts",
      "line": 42,
      "message": "expect(received).toBe(expected) — received 1, expected 2",
      "stack": "Error: expect(received).toBe(expected)...",
      "category": "legitimate | infra | weak_test | flaky | null",
      "raw_framework_output_ref": "classname#testname"
    }
  ],
  "coverage": {
    "lines_pct": 78.4,
    "branches_pct": 65.1,
    "source": "reports/vitest-coverage/coverage-final.json"
  },
  "artifacts": {
    "junit_xml": "/absolute/path/to/reports/results.xml",
    "playwright_trace": "/absolute/path/to/reports/trace.zip",
    "coverage_raw": "/absolute/path/to/reports/coverage-final.json"
  },
  "generated_at": "2026-04-21T17:05:00+00:00"
}
```

### Field semantics

| Field | Meaning |
|-------|---------|
| `run_id` | One per `/relay-test` invocation. Reused across retries in the same session so the report can correlate attempts. |
| `attempt` | 1-based. Initial run = 1, first retry = 2, etc. Max is `1 + max_test_retries` (default `1 + 3 = 4`). |
| `tier` | Layer this run belongs to when layered execution is active. `unit` for flat runs without layers. |
| `framework` | Which tool produced the native output. Informs the classifier's heuristic table. |
| `outcome` | Top-level verdict. `PASSED` only when `counts.failed == 0` and `counts.total > 0`. `SKIPPED_UPSTREAM_FAILURE` when a previous layer failed and skipped this one. The two `FAILED_*` termination codes are set by B4 (auto-correction loop), not by the normalizer — the normalizer emits plain `FAILED` when any test failed; B4 upgrades the code based on whether the retry budget or time budget was the trigger. |
| `duration_ms` | Wall-clock of this single attempt. Per-run `time_breakdown` lives in the `final-report.md`, not here. |
| `counts` | Summary. `total == passed + failed + skipped`. |
| `failures[].category` | Populated by B3 classifier after normalization; starts as `null` from the normalizer. Values: `legitimate` (bug in production code), `infra` (container/service problem), `weak_test` (test itself is broken), `flaky` (non-deterministic). |
| `failures[].raw_framework_output_ref` | Pointer back into the raw JUnit XML for anyone who wants the full context. Format is framework-specific (e.g., `classname#testname` for pytest). |
| `coverage` | Optional. Populated only when a coverage report was emitted and provided to the normalizer via `--coverage`. `lines_pct` / `branches_pct` may be `null` when the raw format isn't parsed yet. |
| `artifacts` | Absolute paths to the raw framework outputs, for audit and debugging. |

### What is NOT in the schema

- `time_breakdown` (infra_setup, per-attempt durations, etc.): lives in
  the run-level `final-report.md`, not in each attempt's record.
- `layers:` section: lives in the run-level `final-report.md`.
- `secrets_redacted`: lives in the run-level `final-report.md`.
- `files_changed_by_autocorrection`: produced by B4 during the loop, not
  by the normalizer.
- Git diff of each attempt: produced by B4, stored at
  `PRPs/reports/<feature>/diff-per-attempt/<N>.patch`.

The schema deliberately stays small — one record per framework run. The
Test Runner aggregates multiple records across attempts, layers, and
frameworks into the final report.

---

## Versioning

Schema version is implied by the presence/absence of fields — the
normalizer reads each field defensively. Breaking changes (renaming a
field, removing one) require a new `schema_version` field at the top
and dual-write compatibility for at least one relay release.

When evolving the schema:

1. Add new fields as optional with documented defaults. Existing
   consumers ignore unknown fields.
2. Deprecating a field requires marking it in this doc and keeping the
   normalizer emitting it for one full minor release.
3. Renaming = remove + add, with both fields present during the
   transition.

---

## Framework-specific mapping notes

### pytest (JUnit XML via `--junitxml`)

- `<testsuite>` root (single suite) or `<testsuites>` (multiple).
- `<testcase classname="..." name="..." file="..." line="..." time="...">` —
  `classname` is Python-path-dotted (`mec10.apps.accounts.tests.test_user`).
- `<failure message="...">...</failure>` or `<error>` for failed tests.
- `<skipped>` for skipped.
- `tier` defaults to `e2e` for runs under `backend/tests/e2e/`, `unit`
  otherwise. Caller sets via `--tier`.

### Playwright (JUnit XML via `reporter: [['junit', ...]]`)

- `<testsuites>` root with one `<testsuite>` per spec file.
- `<testcase classname="<spec-file>" name="<test-title>" time="...">`.
- `<failure>` carries the assertion error including `expect(received).toBe(expected)` style messages.
- Traces at `reports/traces/` (when `trace: 'retain-on-failure'`) —
  caller passes via `--trace`.
- `tier` defaults to `e2e`.

### Vitest (JUnit XML via `reporters: [['junit', ...]]`)

- `<testsuites>` root.
- `<testcase classname="<describe-block>" name="<test-name>" time="...">`.
- `<failure type="...">` includes matcher diff.
- Coverage emitted separately to `reports/vitest-coverage/coverage-final.json`
  when v8 provider is active; pass via `--coverage`.
- `tier` defaults to `unit`.

### node:test (JUnit XML via the built-in `--test-reporter=junit`)

Node's built-in reporter (`node --test --test-reporter=junit
--test-reporter-destination=<path>`) is handled framework-specifically
because it defeats the suite-attribute summing the other frameworks
rely on. It emits two shapes, both of which the normalizer counts by
walking `<testcase>` elements directly:

- **bare** (flat `test()` calls): a `<testsuites>` root with
  `<testcase>` elements nested directly beneath it — no `<testsuite>`
  wrapper and no `tests`/`failures`/`skipped` summary attributes (Node
  reports those totals only in trailing XML comments like
  `<!-- pass 2 -->`).
- **wrapped** (`describe()` / `suite()` blocks): one `<testsuite>` per
  block, arbitrarily NESTED, whose `tests` counts do not sum cleanly
  across the nesting (an outer suite's `tests` already includes its
  inner suites).

Per-testcase mapping:

- `<testcase name="<test-name>" classname="<file-basename-stem>"
  file="<abs-path>" time="...">` — a self-closing `<testcase>` is a
  pass.
- `<failure type="..." message="...">` nested inside `<testcase>` marks
  a failure (Node also mirrors it onto a `failure="..."` attribute on
  the `<testcase>` open tag; the nested element is the signal the
  normalizer keys on). Newlines in the message are `&#10;`-encoded and
  are decoded back to real newlines in the record.
- `<skipped>` nested inside `<testcase>` marks a skip.
- `time` is per-testcase only; `duration_ms` is the sum of per-testcase
  times. `line` is absent, so `failures[].line` is `null`.
- `tier` defaults to `unit`. Coverage/trace are not wired for node:test.

---

## Output path convention in phoenix (reference)

| Framework | JUnit path | Notes |
|-----------|-----------|-------|
| pytest | `/app/reports/results.xml` | Container-absolute path (compose mounts `./reports` to `/app/reports`). Surfaces on host at `reports/results.xml`. |
| Playwright | `/reports/playwright-junit.xml` | Container-absolute (mount `./reports` to `/reports`). Host: `reports/playwright-junit.xml`. |
| Vitest | `frontend/reports/vitest-junit.xml` | Host-relative; Vitest runs on dev machine from `frontend/`, not in a container. Phoenix's root `.gitignore` already ignores `reports/` but Vitest's output lives at `frontend/reports/` — add to a project-level pattern if the team wants to ignore it uniformly. |

The normalizer accepts any path via `--junit`; the table above is the
convention, not a hardcoded expectation.

---

## Observability directory layout (component C4)

Every Test Runner session writes artifacts under
`<worktree>/PRPs/reports/<feature>/` in the following canonical
structure:

```
PRPs/reports/<feature>/
├── run.json                 # B4 command state: session-level summary, attempts[] index, time_breakdown
├── test-review.json         # B5 verdict (APPROVED | CHANGES_REQUESTED) + concerns list
├── final-report.md          # B6 PR-embeddable markdown (produced by generate-final-report.mjs)
├── coverage-baseline.json   # OPTIONAL, team-committed: baseline for coverage-drop detection (see B5)
└── attempts/
    ├── 1/
    │   ├── record.json      # B2 normalized output (this schema) + B3 categories filled in
    │   ├── stdout.log       # redacted execution log (secrets replaced per ${CLAUDE_PLUGIN_ROOT}/resources/redaction-policy.md)
    │   └── diff.patch       # git diff applied by the Implementer for this attempt; empty on attempt 1
    └── 2/
        └── ...
```

Producers:

- `run.json` — written by the `/relay-test` command (Phase 6 / B4 loop state).
- `test-review.json` — written by the `/relay-test-review` command (Phase 7 / B5).
- `final-report.md` — written by `${CLAUDE_PLUGIN_ROOT}/scripts/generate-final-report.mjs`, typically invoked by `/relay-pr` (future; Phase 8 of the overall pipeline, not of this PRD) or manually for audit.
- `coverage-baseline.json` — manually committed by the team. When present, the post-green reviewer compares current coverage against it; when absent, a note explains the limitation without blocking approval.
- `attempts/<N>/record.json` — written by the `test-runner` agent (B1 + B3) after invoking the normalizer.
- `attempts/<N>/stdout.log` — written by the `test-runner` agent, always after redaction.
- `attempts/<N>/diff.patch` — written by the `/relay-test` command when the Implementer applies a fix; empty or absent on attempt 1.

The report generator is tolerant: missing files are handled gracefully
(the corresponding section notes "not run" or is skipped).

---

## Report generator — `generate-final-report.mjs`

Canonical invocation:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/generate-final-report.mjs \
    <worktree>/PRPs/reports/<feature>/ [--out <path>]
```

Reads every file listed above; produces `final-report.md` in the same
directory (or at `--out`). AC-10 compliant: includes outcome,
duration, time_breakdown, attempt-by-attempt detail with failures
table, failure classification histogram, post-green review verdict
with concerns, secrets redaction summary, skipped components, and a
TDD-track section when `tdd_mode: true`.

Like the normalizer, written in Node.js without npm deps.
