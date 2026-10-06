# Feature: Per-test record resolution (Phase 7 of qa-runner-case-vocabulary)

```
**Decision Gate**
- Active context: none
- Activated criteria: impact on shared contracts (`qa-run.mjs` record-resolution evidence, `relay-qa-run.md`); a `pass` the runner never executed (record resolution is the one path that yields a pass without a driver); cross-cutting artifact (a plan downstream stages consume)
- Decisions found:
  - `PRPs/prds/qa-runner-case-vocabulary.prd.md` Decisions Log "Plan side only" — `/relay-qa-report` and the reports are untouched; the parser must accept the citation shapes the existing reports already carry
  - Same PRD, Decisions Log "Phase serialization" — phases 1-7 share `lane:qa-run`; phases 1-6 are `complete`, this phase runs seventh on the same files
  - Same PRD, Decisions Log "Frozen surfaces" — `code-reviewer.md`, `code-reviewer-semantic.md`, `relay-implement.md` and `scripts/visual/capture.mjs` byte-identical (AC-15)
  - Same PRD, Decisions Log "Partial plans and the outcome vocabulary" and `manual-qa-runner-auth-kit.prd.md` AC-17 / "Outcome vocabulary" — `AUTOMATED_EVIDENCE` is a reason code, never an outcome; record-resolved cases are reported apart from the driver-executed rate
  - Phase 4 plan Notes (amendment 2026-10-06), phase 5 and phase 6 plan Notes — a new static sibling import of `qa-run.mjs` breaks the existing tests that copy it alone; every anchor literal of an existing test is kept byte-identical; this phase keeps all code inside `qa-run.mjs`
  - `docs/decisions.md` [2026-05-06] / [2026-07-10] R-X strict — the Implementer authors zero test files; any pinned expectation this phase changes is routed to the test pair as `EXISTING_TEST_UPDATED`
  - [2026-04-19] PRP artifacts live under `PRPs/` at the repository root, never under `.claude/`
- Applicable anti-patterns:
  - "Weakening or deleting tests to make the auto-correction loop turn green" — no existing test is edited by the Implementer; the two pinned expectations this phase flips are listed in Notes for the test pair
  - "Emitting secret values in run reports or logs" — cited titles come from the report text and still pass through the single write helper's redaction
  - "Writing pipeline artifacts under `.claude/`"
  - "Treating `plugins/prp-core/` as active relay code"
- Applicable architectural rules:
  - Command versus agent separation — the script owns record resolution; the planning agent writes no plan entry for it
  - `${CLAUDE_PLUGIN_ROOT}` resolves only inside `plugins/relay/`; target-scoped paths are cited bare
  - `qa-run-contract` invariants stay true for `qa-run.mjs`: exact four-value `OUTCOMES`, one `// GUARD-SITE`, one `// WRITE-SITE`, one `writeFileSync(`, one `renameSync(`
  - Interactivity boundary — no new extension; no operator dialogue
- Result: PROCEED
```

## Source PRD

- `PRPs/prds/qa-runner-case-vocabulary.prd.md` — Implementation Phases row 7: "Per-test record resolution" — Goal: an automated-coverage case is decided by the tests it cites, not by their whole file — Success signal: a `praesto-sum`-shaped record where one `describe` fails fails only the cases citing that block.

## Summary

This phase makes record resolution per-test. Today `resolveFromRecord` matches only the cited test FILE against the JUnit testcases, so cases 10-18 of `praesto-sum`, which cite nine different `describe` blocks of one file, all resolve from the same 13 testcases (finding PS4). The runner gains a title layer. Pure helpers read the citation shapes the reports already carry (a `describe("...")`, `it("...")` or `test("...")` call in the `Automated test path` field, optionally followed by a `›` chain to a test title, and a backticked `<path>::<title>` or `<path> > <title>` span), attach each title to the cited file it follows, and match it exactly against a testcase's name, class name or enclosing suite name (or one ` > `-separated segment of a name). Only the matching testcases decide the outcome; a cited title with no match, or a title that cannot be attached to a cited file, leaves the case unresolved; a field citing only a file stays per file and the evidence records `granularity: file`. The change is additive inside `qa-run.mjs` (no new import, every existing anchor line byte-identical, the existing `files.push` line kept for the file-level path), `relay-qa-run.md` gains two bullets in its record-resolution section, and `/relay-qa-report` is untouched.

## User Story

As the operator of relay's human validation gate
I want an automated-coverage case decided only by the tests it cites
So that one failing `describe` fails exactly the cases citing it, instead of every case that cites the same file

## Problem Statement

`qa-run.mjs` resolves a case from the Test Runner's record by matching the cited test file against the JUnit `file`/`classname` and deciding over every non-skipped testcase of that file. A report that cites `test/missed-sweep.test.ts` with nine different `describe` blocks (`praesto-sum` cases 10-18) therefore resolves nine cases from the same 13 testcases: a failure in one block fails all nine, and a pass in the file passes all nine even when a cited block is absent from the run. Test titles are used only to list failures.

## Solution Statement

Plan side and runner side only. Add exported pure helpers (`normalizeTestCitation`, `extractCitedTitles`, `titleMatchesTestcase`, `readJunitSuiteChains`) next to `extractTestPaths`, leaving `extractTestPaths`, `readJunitTestcases` and every anchor line of the existing record-resolution tests byte-identical. In `resolveFromRecord`, run `extractTestPaths` over the normalized field, extract the cited titles, and, per cited path that has titles, decide over only the testcases the titles match (all segments of one citation must match the same testcase; separate citations are alternatives; every citation must match at least one non-skipped testcase). A path without titles goes through the unchanged file-level lines. The evidence value gains a top-level `granularity` (`file`, `test` or `mixed`); a title-level `files` entry additionally carries `granularity: 'test'` and `titles`, and a file-level entry is unchanged, so every existing `files` assertion stays true. The format of a title in the report is not changed: the parser accepts what the reports carry.

## Metadata

| Key | Value |
|-----|-------|
| Type | enhancement |
| Complexity | MEDIUM |
| Systems Affected | `plugins/relay/scripts/qa-run.mjs`; `plugins/relay/commands/relay-qa-run.md` |
| Dependencies | Phase 1 (`complete`); phases 2-6 (`complete`) share the same files. No new package. |
| Estimated Tasks | 4 |
| Source PRD line ref | `PRPs/prds/qa-runner-case-vocabulary.prd.md` lines 232 (row 7), 276-279 (Phase Details), 115 (AC-14), 116-122 (AC-15) |
| phase_type | feature |

## Mandatory Reading

| Priority | Path | Lines | Why |
|----------|------|-------|-----|
| P0 | `PRPs/prds/qa-runner-case-vocabulary.prd.md` | 115, 163, 276-279 | AC-14, the Should rationale and the Phase 7 scope and success signal |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1871-1962 | the record-resolution constants, `findTestRunnerRecord`, `isSchemaV1Record`, `looksPathLike` and `extractTestPaths` (left untouched; the new helpers mirror its token handling and reuse `TEST_PATH_RE`) |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 1964-2002 | `xmlDecode` and `readJunitTestcases` (untouched; the new suite-chain reader mirrors its attribute-aware regex) |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 2004-2064 | `resolveFromRecord`, the function whose loop and evidence value are extended |
| P0 | `plugins/relay/scripts/qa-run.mjs` | 2188-2199 | `executeCase`'s record branch: the evidence write and the `AUTOMATED_EVIDENCE` result, unchanged |
| P0 | `scripts/validate/checks/qa-run-record-resolution.test.mjs` | 41-45, 101-109, 241-286, 487-510, 623-748 | the exactly-once `mutatedCopy` anchors and the two tests whose pinned expectations this phase flips |
| P0 | `plugins/relay/commands/relay-qa-run.md` | 374-397 | the record-resolution section the two new bullets extend |
| P1 | `plugins/relay/commands/relay-qa-report.md` | 97 | the only statement of how a test name appears in the field: "the repo-relative path (and test name, when derivable)"; no format is fixed, so the parser accepts the shapes reports carry |
| P1 | `PRPs/plans/completed/qa-runner-case-vocabulary-phase-6-ui-grounding.plan.md` | 695-726, 767-782 | the lone-copy and frozen-surface VALIDATE shapes and the Notes conventions this plan follows |
| P1 | `docs/anti-patterns.md` | 34-39 | secret-leak rule governing evidence |

## Patterns to Mirror

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1932-1946
function extractTestPaths(field) {
  if (!isStr(field)) return { paths: [], refused: false };
  /** @type {string[]} */ const found = [];
  let refused = false;
  /** @param {string} tok */
  const consider = (tok) => {
    if (TEST_PATH_RE.test(tok)) found.push(tok.split('\\').join('/').replace(/^\.\//, ''));
    else if (looksPathLike(tok)) refused = true;
  };
  const spans = [...field.matchAll(/`([^`]*)`/g)].map((m) => m[1].trim());
  for (const s of spans) {
    if (/[("']/.test(s) || s === '') continue; // plainly prose
    if (/\s/.test(s) && !looksPathLike(s)) continue;
    consider(s);
  }
```
Copied by Task 1 (`normalizeTestCitation` and `extractCitedTitles` read the same backticked spans and the same path grammar `TEST_PATH_RE`, and normalize a path the same way: backslash to `/`, leading `./` dropped; `extractTestPaths` itself is not edited).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:1979-1999
function readJunitTestcases(xml) {
  /** @type {{ name: string, file: string | null, classname: string | null, failed: boolean, skipped: boolean }[]} */
  const out = [];
  const re = /<testcase\b((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const attrText = m[1];
    /** @type {Record<string, string>} */ const attrs = {};
    for (const a of attrText.matchAll(/([A-Za-z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) attrs[a[1]] = xmlDecode(a[2] ?? a[3] ?? '');
    let body = '';
    if (!attrText.trimEnd().endsWith('/')) {
      const end = xml.indexOf('</testcase>', re.lastIndex);
      body = end >= 0 ? xml.slice(re.lastIndex, end) : '';
    }
    out.push({
      name: attrs.name ?? '',
      file: isStr(attrs.file) && attrs.file !== '' ? attrs.file : null,
      classname: isStr(attrs.classname) && attrs.classname !== '' ? attrs.classname : null,
      failed: /<(failure|error)\b/.test(body),
      skipped: /<skipped\b/.test(body),
    });
  }
```
Copied by Task 1 (`readJunitSuiteChains` uses the same quote-aware attribute pattern and `xmlDecode`; `readJunitTestcases` is not edited and its `failed:` line is an exactly-once test anchor).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:2035-2046
  const cases = readJunitTestcases(xml).map((t) => {
    const loc = t.file !== null ? t.file : t.classname;
    return { ...t, loc: loc === null ? null : loc.split('\\').join('/') };
  });
  /** @type {{ cited: string, testcases: number, failed: string[] }[]} */ const files = [];
  for (const p of paths) {
    const hit = cases.filter((t) => t.loc !== null && (t.loc === p || t.loc.endsWith(`/${p}`)));
    if (new Set(hit.map((t) => t.loc)).size !== 1) return null;
    const ran = hit.filter((t) => !t.skipped);
    if (ran.length === 0) return null;
    files.push({ cited: p, testcases: ran.length, failed: ran.filter((t) => t.failed).map((t) => t.name) });
  }
```
Copied by Task 2 (the title block is inserted between `if (ran.length === 0) return null;` and the `files.push(` line, which stays byte-identical and still serves every path without titles; the `hit` filter line, the `new Set(...)` line and the `ran` line are exactly-once test anchors).

```
# SOURCE: plugins/relay/scripts/qa-run.mjs:2047-2063
  const total = files.reduce((n, f) => n + f.testcases, 0);
  const failedCount = files.reduce((n, f) => n + f.failed.length, 0);
  const head = `resolved from ${found.rel} (run ${rec.run_id}, attempt ${rec.attempt}, generated ${rec.generated_at}); ${total} test case(s) in ${files.length} file(s), `;
  return {
    outcome: failedCount > 0 ? 'fail' : 'pass',
    reason: head + (failedCount > 0 ? `${failedCount} failed` : 'none failed'),
    value: {
      resolved_from: 'test-runner-record',
      record: found.rel,
      record_run_id: rec.run_id,
      record_attempt: rec.attempt,
      record_generated_at: rec.generated_at,
      junit_artifact: junit,
      junit_artifact_mtime: mtimeIso,
      files,
    },
  };
```
Copied by Task 2 (one `granularity` property is added to `value` after `files,`; `head`, `reason` and every other property stay byte-identical).

```
# SOURCE: plugins/relay/commands/relay-qa-run.md:382-397
- The outcome comes from the JUnit testcases of each cited test file in the
  record's artifact: every cited file listed and none failed gives `pass`, any
  failed testcase gives `fail`, and any cited file the artifact does not list
  means the case is not resolved.
- The reason_code is `AUTOMATED_EVIDENCE`. It is a reason_code, never an outcome:
  the vocabulary stays `pass`, `fail`, `blocked`, `needs-human`.
- A record outside schema v1 is never evidence, and the case routes as before. So
  is a record whose run executed nothing (`SKIPPED_UPSTREAM_FAILURE` or zero
  tests), a JUnit artifact written after the record, and a cited path that
  matches more than one distinct file.
- The evidence names the record's run id, attempt and `generated_at`, so a reader
  can see whether the run predates the code.
- `results.json` reports these cases through a separate `record_resolved` count.
  `counts` stays the four-outcome partition and therefore still contains them, so
  the summary line and the driver-executed rate exclude `AUTOMATED_EVIDENCE`
  outcomes and `record_resolved` is reported beside them, never added to them.
```
Copied by Task 3 (two bullets are appended after the last bullet; no existing line changes).

## Files to Change

| File | Action | Justification |
|------|--------|---------------|
| `plugins/relay/scripts/qa-run.mjs` | UPDATE | exported `normalizeTestCitation`, `extractCitedTitles`, `titleMatchesTestcase`, `readJunitSuiteChains`; title-scoped decision and `granularity` evidence in `resolveFromRecord` |
| `plugins/relay/commands/relay-qa-run.md` | UPDATE | two bullets in the record-resolution section: title-level resolution and `granularity` |

## NOT Building (Scope Limits)

- Any change to `/relay-qa-report` or to the reports; the report format is not changed. The parser accepts the shapes the reports already carry (`describe("...")` calls, a `›` chain, `<path>::<title>`, `<path> > <title>`).
- A fifth outcome. `AUTOMATED_EVIDENCE` stays a reason code; an unmatched title is "not resolved", routed exactly as before (`needs-human` `NO_PLAN_ENTRY` when no plan entry exists).
- Loose matching: no substring, prefix, case-insensitive, regex, dot-joined class name (`Math.Addition`) or space-joined (`jest-junit` default) title matching. A title the exact rules cannot match is unresolved, never guessed. Frameworks whose default JUnit names cannot be split into `describe` segments are therefore resolved per file only when the report cites no title.
- A new sibling module or any static import; any edit of `extractTestPaths`, `readJunitTestcases`, `findTestRunnerRecord`, `isSchemaV1Record`, `executeCase`, or any existing anchor line of the record-resolution tests (see Notes).
- Any change to the `reason` text or to the shape of a file-level `files` entry.
- Any test file and any change to `scripts/validate/checks/*` by this phase (R-X strict). Phases 1-6 already left check files modified and uncommitted; this phase adds nothing to them.
- Any change to `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md` or `plugins/relay/scripts/visual/capture.mjs` (AC-15).
- Any `documentation/` or `docs/` edit, a release or version bump. The release is cut after the phase 8 dogfood.
- Edits to the installed plugin cache under `~/.claude/plugins/cache`.

## Step-by-Step Tasks

### Task 1: UPDATE plugins/relay/scripts/qa-run.mjs — the citation, title-matching and suite-chain helpers

- **ACTION**: Delivers AC-A4 (the citation shapes the reports carry are accepted) and the pure half of AC-A1 and AC-A2 (exact title matching). In `plugins/relay/scripts/qa-run.mjs`, directly after the closing brace of `extractTestPaths` and before `xmlDecode`'s doc comment, add only exported pure functions (no I/O, no `console.*`, no `writeFileSync(`/`renameSync(`, no `outcome:` literal, no `import`), and one more after `readJunitTestcases`. A title is always whitespace-collapsed (`/\s+/g` to one space) and trimmed, and blank titles are dropped.
  1. `normalizeTestCitation(field)`: returns a non-string input unchanged. For a string, rewrites every backticked span whose trimmed text matches `^([A-Za-z0-9_@./\\-]+\.[A-Za-z0-9]{1,5})(?:::|\s+[>›]\s+)(.+)$` to a span holding only the first capture group (the path), so `` `test/a.ts::AC-1` `` and `` `test/a.ts > AC-1 > t1` `` become `` `test/a.ts` ``; every other character of the field, and every span that does not match (for example `` `tests/my file.spec.ts` ``), is left exactly as it was.
  2. `extractCitedTitles(field)`: returns `{ items: { segments: string[], path: string | null }[] }`; a non-string input returns `{ items: [] }`. One item is one cited unit; `segments` are the titles that must ALL match the same testcase. Recognized shapes, scanning the raw field text (the call forms are scanned inside backticks too):
     - a call citation `describe(`, `it(`, `test(` or `suite(` followed by a double- or single-quoted string with backslash-escaped quotes unescaped; directly after it (optional whitespace), each `›` or `>` followed by a quoted string appends one segment, so `describe("A") › "t"` is ONE item with segments `["A", "t"]` and `describe("A") plus describe("B")` is TWO items;
     - a backticked span `<path>::<title>` or `<path> > <title>` / `<path> › <title>` (the same grammar as step 1): one item whose segments are the remainder split on `\s+[>›]\s+`, with `path` the span's path.
     The `path` of a call citation is the path (normalized as `extractTestPaths` does: backslash to `/`, leading `./` dropped) of the nearest backticked span that starts before the citation and whose text, after stripping a `::`/` > ` suffix, matches `TEST_PATH_RE`; `null` when no such span precedes it. Identical items (same `path` and `segments`) are de-duplicated; a field with no title returns `{ items: [] }`.
  3. `titleMatchesTestcase(segment, tc)`: `segment` is one title, `tc` is `{ name: string, classname?: string | null, suites?: string[] }`. True when, after whitespace collapse and trim, `segment` equals `tc.name`, `tc.classname` or any entry of `tc.suites`, or equals any one of the pieces of `tc.name` obtained by splitting on `\s+[>›]\s+`. Case-sensitive; no substring or prefix matching (`"AC-1"` does not match `"AC-10 > t"`).
  4. `readJunitSuiteChains(xml)`: returns an array with one entry per `<testcase` of the document, in document order, each the array of enclosing `<testsuite name="...">` names, outermost first (entities decoded with `xmlDecode`; a self-closing `<testsuite ... />` encloses nothing; a self-closing `<testcase ... />` still gets an entry). It never throws and returns `[]` for a non-string.
  Add `@param`/`@returns` JSDoc (the file is `// @ts-check`). Do not edit `extractTestPaths`, `readJunitTestcases` or any existing line.
  Delivers AC-A4 and the pure halves of AC-A1 and AC-A2 (this task).
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:1932-1946` (backticked-span reading, the path grammar and the path normalization) and `# SOURCE: plugins/relay/scripts/qa-run.mjs:1979-1999` (the quote-aware tag/attribute regex for `readJunitSuiteChains`).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  node --input-type=module -e '
  import assert from "node:assert/strict";
  import { extractCitedTitles, normalizeTestCitation, titleMatchesTestcase, readJunitSuiteChains } from "./plugins/relay/scripts/qa-run.mjs";
  const D = "\u2014", R = "\u203a";
  const items = (f) => extractCitedTitles(f).items;
  assert.deepEqual(items("`test/a.ts` " + D + " describe(\"AC-1 Pure\") " + R + " \"t1\""), [{ segments: ["AC-1 Pure", "t1"], path: "test/a.ts" }], "a chain is one item");
  assert.deepEqual(items("`a/x.ts` " + D + " describe(\"A\") plus describe(\x27B\x27)"), [{ segments: ["A"], path: "a/x.ts" }, { segments: ["B"], path: "a/x.ts" }], "two describes are two items");
  assert.deepEqual(items("`a.ts` " + D + " describe(\"A\"), `b.ts` " + D + " describe(\"B\")"), [{ segments: ["A"], path: "a.ts" }, { segments: ["B"], path: "b.ts" }], "a title attaches to the nearest preceding path");
  assert.deepEqual(items("`t/a.ts::A > b`"), [{ segments: ["A", "b"], path: "t/a.ts" }], "the :: span form");
  assert.deepEqual(items("`t/a.ts > A " + R + " b`"), [{ segments: ["A", "b"], path: "t/a.ts" }], "the > span form");
  assert.deepEqual(items("`t/a.ts`"), [], "a bare file cites no title");
  assert.deepEqual(items("describe(\"A\") in `t/a.ts`"), [{ segments: ["A"], path: null }], "a title before any path is unattached");
  assert.deepEqual(items("`t.ts` test(\"x\") it(\x27y\x27)"), [{ segments: ["x"], path: "t.ts" }, { segments: ["y"], path: "t.ts" }], "test and it calls");
  assert.deepEqual(items("`x.ts` describe(\"say \\\"hi\\\"\")"), [{ segments: ["say \"hi\""], path: "x.ts" }], "an escaped quote is unescaped");
  assert.deepEqual(items("`x.ts` describe(\"AC-1   Pure\")"), [{ segments: ["AC-1 Pure"], path: "x.ts" }], "whitespace is collapsed");
  assert.deepEqual(items("`x.ts` describe(\"A\") describe(\"A\")"), [{ segments: ["A"], path: "x.ts" }], "identical items are de-duplicated");
  assert.deepEqual(extractCitedTitles(null), { items: [] });
  assert.equal(normalizeTestCitation("`t/a.ts::A`, `t/b.ts > X > y`, `c.ts`"), "`t/a.ts`, `t/b.ts`, `c.ts`");
  assert.equal(normalizeTestCitation("`tests/a.spec.ts`, `tests/my file.spec.ts`"), "`tests/a.spec.ts`, `tests/my file.spec.ts`");
  assert.equal(normalizeTestCitation(null), null);
  const m = (s, tc) => titleMatchesTestcase(s, tc);
  assert.ok(m("AC-1", { name: "AC-1 > t", classname: "f.ts" }), "a describe segment of a vitest name");
  assert.ok(m("t", { name: "AC-1 > t" }), "the test segment");
  assert.ok(m("AC-1", { name: "AC-1 " + R + " t" }), "the Playwright separator");
  assert.ok(!m("AC-1", { name: "AC-10 > t" }), "no prefix matching");
  assert.ok(!m("AC", { name: "AC-1" }), "no substring matching");
  assert.ok(!m("ac-1", { name: "AC-1 > t" }), "case-sensitive");
  assert.ok(m("AC-1 Pure", { name: "AC-1   Pure > t" }), "whitespace is collapsed on both sides");
  assert.ok(m("S", { name: "x", classname: "test", suites: ["m", "S"] }), "an enclosing suite name");
  assert.ok(!m("S", { name: "x", classname: "test", suites: ["m"] }), "a suite that does not enclose does not match");
  assert.deepEqual(readJunitSuiteChains("<testsuites><testsuite name=\"a\"><testsuite name=\"b &amp; c\"><testcase name=\"x\"/></testsuite><testcase name=\"y\"></testcase></testsuite><testcase name=\"z\"/></testsuites>"), [["a", "b & c"], ["a"], []]);
  assert.deepEqual(readJunitSuiteChains(5), []);
  '
  ```
  Before this task none of the four names is exported, so the import fails and the block exits non-zero.

### Task 2: UPDATE plugins/relay/scripts/qa-run.mjs — resolve a titled citation from only the testcases it names

- **ACTION**: Delivers AC-A1 (only the matching testcases decide the outcome), AC-A2 (a cited title with no match is not resolved), AC-A3 (a file-only citation stays per file and records `granularity: file`) and AC-A6 (one failing `describe` fails only the cases citing it). In `resolveFromRecord`, change or add only the following; every other line, and in particular each exactly-once anchor line of `qa-run-record-resolution.test.mjs` (`if (!isSchemaV1Record(rec)) return null;`, `if (Number.isNaN(generated)) return null;`, `if (st.mtimeMs > generated + JUNIT_MTIME_SLACK_MS) return null;`, the `hit` filter line `t.loc !== null && (t.loc === p || t.loc.endsWith(\`/${p}\`))`, `if (new Set(hit.map((t) => t.loc)).size !== 1) return null;`, `if (ran.length === 0) return null;`, `if (cov !== 'automated') return null;`), stays byte-identical:
  1. Replace `extractTestPaths(kase.automated_test_path)` in the destructuring line by `extractTestPaths(normalizeTestCitation(kase.automated_test_path))`.
  2. On the next line after the existing `if (refused || paths.length === 0) return null;`, add `const cited = extractCitedTitles(kase.automated_test_path).items;` and `if (cited.some((c) => c.path === null || !paths.includes(c.path))) return null;`: a title that cannot be attached to a cited file leaves the whole case unresolved.
  3. Change the line `const cases = readJunitTestcases(xml).map((t) => {` to `const chains = readJunitSuiteChains(xml);` followed by `const cases = readJunitTestcases(xml).map((t, ti) => {`, and the `return { ...t, loc: ... };` line to also carry `suites: chains.length === readJunitTestcases(xml).length ? chains[ti] : []` computed from a single `const all = readJunitTestcases(xml);` (call the reader once; `suites` is `[]` when the two arrays differ in length). The `loc` computation is unchanged.
  4. Directly after the line `if (ran.length === 0) return null;` and before the existing `files.push(` line, insert: `const mine = cited.filter((c) => c.path === p);` and a block `if (mine.length > 0) {` that computes, for each item, the non-skipped testcases of this file for which EVERY segment satisfies `titleMatchesTestcase(segment, { name: t.name, classname: t.classname, suites: t.suites })`; `return null` when any item matches none; sets `scoped` to the union of those testcases; `files.push({ cited: p, testcases: scoped.length, failed: scoped.filter((t) => t.failed).map((t) => t.name), granularity: 'test', titles: mine.map((c) => c.segments.join(' > ')) });` and `continue;` then closes the block. The existing `files.push(` line that follows is left byte-identical and serves every path with no titles. Update the `files` JSDoc type (the `@type` comment line above `const files = [];`) to allow the two optional keys.
  5. In the `value:` object, add one property after `files,`: `granularity: files.every((f) => f.granularity === 'test') ? 'test' : files.some((f) => f.granularity === 'test') ? 'mixed' : 'file',`. Do not edit `head`, `reason` or any other property.
  6. Add no `import`, no `writeFileSync(` or `renameSync(` call, no `outcome:` literal, no second `// GUARD-SITE` marker; do not change `OUTCOMES`.
  Delivers AC-A1, AC-A2, AC-A3 and AC-A6 (this task).
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:2035-2046` (the loop the title block is inserted into) and `# SOURCE: plugins/relay/scripts/qa-run.mjs:2047-2063` (the evidence value the `granularity` property joins).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  node --input-type=module -e '
  import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, utimesSync } from "node:fs";
  import { tmpdir } from "node:os";
  import { join, resolve } from "node:path";
  import { spawn } from "node:child_process";
  import assert from "node:assert/strict";
  const SRC = resolve("plugins/relay/scripts");
  const tmp = mkdtempSync(join(tmpdir(), "qa-pertest-"));
  // A lone copy of the runner plus the guard only, as the existing tests copy it: a new static sibling import would not start.
  const sd = join(tmp, "plugins", "relay", "scripts");
  mkdirSync(sd, { recursive: true });
  copyFileSync(join(SRC, "qa-run.mjs"), join(sd, "qa-run.mjs"));
  copyFileSync(join(SRC, "auth-local-guard.mjs"), join(sd, "auth-local-guard.mjs"));
  const SCRIPT = join(sd, "qa-run.mjs");
  const root = join(tmp, "proj");
  const rd = join(root, "PRPs", "reports", "feat");
  const RUN = "PRPs/reports/feat/qa-run/20261006T100000000Z";
  mkdirSync(join(root, ...RUN.split("/"), "evidence"), { recursive: true });
  const D = "\u2014", R = "\u203a";
  const F = "test/m.test.ts", G = "test/g.test.ts";
  const tc = (cls, name, bad) => "<testcase classname=\"" + cls + "\" name=\"" + name + "\" time=\"0.1\">" + (bad ? "<failure message=\"boom\"/>" : "") + "</testcase>";
  const xml = "<?xml version=\"1.0\"?><testsuites>" + [
    tc(F, "AC-1 Pure &gt; t1"), tc(F, "AC-1 Pure &gt; t2"), tc(F, "AC-2 Noop &gt; t3", true), tc(F, "AC-3 Cat &gt; t4"), tc(G, "Suite G &gt; g1"),
  ].join("") +
    "<testsuite name=\"n.test\"><testsuite name=\"AC-5 Anchor\"><testcase name=\"t5\" classname=\"test\" file=\"/proj/test/n.test.mjs\"/></testsuite>" +
    "<testsuite name=\"AC-6 Other\"><testcase name=\"t6\" classname=\"test\" file=\"/proj/test/n.test.mjs\"><failure message=\"boom\"/></testcase></testsuite></testsuite></testsuites>";
  mkdirSync(rd, { recursive: true });
  const junit = join(rd, "junit.xml");
  writeFileSync(junit, xml);
  const past = new Date(Date.now() - 60000);
  utimesSync(junit, past, past);
  writeFileSync(join(rd, "record.json"), JSON.stringify({ run_id: "r-1", attempt: 1, tier: "unit", framework: "vitest", outcome: "FAILED", duration_ms: 5, counts: { passed: 5, failed: 2, skipped: 0, total: 7 }, failures: [], artifacts: { junit_xml: junit }, generated_at: new Date().toISOString() }));
  const paths = [
    "`" + F + "` " + D + " describe(\"AC-1 Pure\")",
    "`" + F + "` " + D + " describe(\"AC-2 Noop\")",
    "`" + F + "` " + D + " describe(\"AC-3 Cat\")",
    "`" + F + "` " + D + " describe(\"AC-9 Missing\")",
    "`" + F + "`",
    "`" + F + "::AC-1 Pure`",
    "`" + F + " > AC-1 Pure > t1`",
    "`" + F + "` " + D + " describe(\"AC-1 Pure\") " + R + " \"t1\"",
    "`" + F + "` " + D + " describe(\"AC-1 Pure\"), `" + G + "` " + D + " describe(\"Suite G\")",
    "`" + F + "` " + D + " describe(\"AC-1 Pure\"), `" + G + "`",
    "describe(\"AC-1 Pure\") in `" + F + "`",
    "`" + F + "` " + D + " describe(\"AC-1 \u2026\")",
    "`test/n.test.mjs` " + D + " describe(\"AC-5 Anchor\")",
    "`test/n.test.mjs` " + D + " describe(\"AC-6 Nothing\")",
    "`test/n.test.mjs`",
  ];
  const block = (n, p) => "### " + n + " " + D + " Case " + n + "\n- **Risk level:** High\n- **Required state:** none\n- **Coverage:** automated\n- **Automated test path:** " + p + "\n- **Manual status:** pending\n- **Manual step-by-step:**\n  1. do it by hand\n\n";
  writeFileSync(join(rd, "qa-report.md"), "# QA Report\n\n" + paths.map((p, i) => block(i + 1, p)).join(""));
  const r = await new Promise((res) => { const c = spawn(process.execPath, [SCRIPT, "run", "--root", root, "--feature", "feat", "--run-dir", RUN], { cwd: root }); let e = ""; c.stderr.on("data", (d) => { e += d; }); c.on("close", (code) => res({ code, e })); });
  assert.equal(r.code, 0, "run exited " + r.code + ": " + r.e);
  const results = JSON.parse(readFileSync(join(root, ...RUN.split("/"), "results.json"), "utf8"));
  const P = "pass:AUTOMATED_EVIDENCE", X = "fail:AUTOMATED_EVIDENCE", N = "needs-human:NO_PLAN_ENTRY";
  assert.deepEqual(results.cases.map((c) => c.outcome + ":" + c.reason_code), [P, X, P, N, X, P, P, P, P, P, N, N, P, N, X]);
  assert.equal(results.record_resolved, 11);
  assert.deepEqual(results.counts, { pass: 8, fail: 3, blocked: 0, "needs-human": 4 });
  assert.equal(results.report_sha256_before, results.report_sha256_after, "the report must stay byte-identical");
  const ev = (i) => JSON.parse(readFileSync(join(root, ...results.cases[i].evidence[0].split("/")), "utf8"));
  const e1 = ev(0);
  assert.equal(e1.granularity, "test");
  assert.equal(e1.files[0].testcases, 2);
  assert.deepEqual(e1.files[0].failed, []);
  assert.deepEqual(e1.files[0].titles, ["AC-1 Pure"]);
  assert.deepEqual(ev(1).files[0].failed, ["AC-2 Noop > t3"], "only the cited describe decides, and it names its failing test");
  assert.equal(ev(1).files[0].testcases, 1);
  const e5 = ev(4);
  assert.equal(e5.granularity, "file", "a file-only citation records granularity: file");
  assert.equal(e5.files[0].testcases, 4);
  assert.equal(e5.files[0].granularity, undefined, "a file-level entry keeps its original shape");
  assert.deepEqual(Object.keys(e5.files[0]).sort(), ["cited", "failed", "testcases"]);
  assert.equal(ev(5).files[0].testcases, 2, "the :: form");
  assert.equal(ev(6).files[0].testcases, 1, "the > form");
  assert.equal(ev(7).files[0].testcases, 1, "a describe-then-test chain narrows to one testcase");
  assert.equal(ev(8).granularity, "test");
  assert.equal(ev(8).files.length, 2);
  assert.equal(ev(9).granularity, "mixed");
  assert.equal(ev(12).files[0].testcases, 1, "an enclosing suite name scopes a node:test-shaped file");
  assert.deepEqual(ev(12).files[0].failed, [], "a failing sibling suite of the same file does not fail the cited one");
  assert.deepEqual(ev(14).files[0].failed, ["t6"], "the file-only citation of the same file fails");
  '
  ```
  Before this task cases 1, 3, 4, 6-9 and 11-14 do not route as asserted (a titled citation is decided over the whole file and there is no `granularity`), so the assertions exit non-zero. The fixture is complete (record, JUnit artifact older than `generated_at`, report in the canonical layout, run directory with `evidence/`) and the script is spawned by absolute path from a lone copy.

### Task 3: UPDATE plugins/relay/commands/relay-qa-run.md — document title-level resolution and `granularity`

- **ACTION**: Delivers AC-A5 (the planning agent and the operator can read how a citation is decided). In `plugins/relay/commands/relay-qa-run.md`, in the `### Record resolution (done by the script, not by you)` section, directly after the last existing bullet (the one ending `never added to them.`), append exactly these two bullets and change no existing line:
  - `- A cited test title narrows the decision to the testcases it names: a `describe("...")`, `it("...")` or `test("...")` citation (optionally followed by a `›` chain to a test title), or a `<path>::<title>` or `<path> > <title>` span, in the same field as the cited file. Each cited title must match a JUnit testcase of that file exactly (its name, its class name or an enclosing suite name, or one ` > `-separated segment of its name); only the matching testcases decide the outcome, and a cited title with no match, or one that follows no cited file, leaves the case not resolved.`
  - `- When the field cites only a file, resolution stays per file and the evidence records `granularity: file`; a title-level resolution records `granularity: test`, and a case citing both kinds records `granularity: mixed`.`
  Reproduce the backticks exactly as written above. Do not edit `documentation/` or `docs/`. Delivers AC-A5 (this task).
- **MIRROR**: `# SOURCE: plugins/relay/commands/relay-qa-run.md:382-397` (the bullet list the two new bullets extend).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  node --input-type=module -e '
  import { readFileSync } from "node:fs";
  const doc = readFileSync("plugins/relay/commands/relay-qa-run.md", "utf8").replace(/\r\n/g, "\n");
  const need = [
    "- A cited test title narrows the decision to the testcases it names:",
    "leaves the case not resolved.",
    "- When the field cites only a file, resolution stays per file and the evidence records `granularity: file`;",
    "a title-level resolution records `granularity: test`, and a case citing both kinds records `granularity: mixed`.",
    "- The outcome comes from the JUnit testcases of each cited test file in the",
    "never added to them.",
  ];
  for (const s of need) if (!doc.includes(s)) { console.error("missing from relay-qa-run.md: " + s); process.exit(1); }
  const i = doc.indexOf("never added to them."), j = doc.indexOf("A cited test title narrows");
  if (!(i > 0 && j > i)) { console.error("the new bullets must follow the existing record-resolution bullets"); process.exit(1); }
  '
  npm run validate
  ```
  Before this task the new sentences are absent, so the first block exits non-zero. `npm run validate` includes `qa-run-contract`, which re-validates every marked literal step example of the doc against the script.

### Task 4: UPDATE plugins/relay/scripts/qa-run.mjs — verify the surface and the anchors are undisturbed (no new code)

- **ACTION**: Delivers the AC-A5/AC-A7 regression guard that no earlier task may skip: after Tasks 1-3, confirm without editing anything that every exactly-once anchor literal of `qa-run-record-resolution.test.mjs` still occurs exactly once in `plugins/relay/scripts/qa-run.mjs`, that the runner still has exactly one `writeFileSync(` and one `renameSync(` and the exact four-value `OUTCOMES`, and that the runner copied ALONE with only the guard still starts. If any count differs, the offending earlier task rewrote an anchor line: restore the original line byte-for-byte and re-apply the change around it. This task changes no file by itself. Delivers AC-A7 (this task).
- **MIRROR**: `# SOURCE: plugins/relay/scripts/qa-run.mjs:2035-2046` (the lines whose bytes must survive).
- **VALIDATE**:
  ```bash
  set -euo pipefail
  node --input-type=module -e '
  import { readFileSync, mkdtempSync, mkdirSync, copyFileSync } from "node:fs";
  import { tmpdir } from "node:os";
  import { join } from "node:path";
  import { spawnSync } from "node:child_process";
  const src = readFileSync("plugins/relay/scripts/qa-run.mjs", "utf8").replace(/\r\n/g, "\n");
  const count = (s) => src.split(s).length - 1;
  const once = [
    "if (!isSchemaV1Record(rec)) return null;",
    "if (Number.isNaN(generated)) return null;",
    "if (st.mtimeMs > generated + JUNIT_MTIME_SLACK_MS) return null;",
    "t.loc !== null && (t.loc === p || t.loc.endsWith(`/${p}`))",
    "if (new Set(hit.map((t) => t.loc)).size !== 1) return null;",
    "if (ran.length === 0) return null;",
    "if (tok !== \x27\x27 && looksPathLike(tok)) refused = true;",
    "if (cov !== \x27automated\x27) return null;",
    "failed: /<(failure|error)\\b/.test(body),",
    "best = Math.max(best, Number(ent.name));",
    "export const OUTCOMES = [\x27pass\x27, \x27fail\x27, \x27blocked\x27, \x27needs-human\x27];",
  ];
  for (const a of once) if (count(a) !== 1) { console.error("anchor occurs " + count(a) + " times, expected 1: " + a); process.exit(1); }
  if (count("writeFileSync(") !== 1 || count("renameSync(") !== 1) { console.error("the single-write-helper invariant broke"); process.exit(1); }
  const dir = mkdtempSync(join(tmpdir(), "qa-alone-"));
  mkdirSync(join(dir, "scripts"), { recursive: true });
  copyFileSync("plugins/relay/scripts/qa-run.mjs", join(dir, "scripts", "qa-run.mjs"));
  copyFileSync("plugins/relay/scripts/auth-local-guard.mjs", join(dir, "scripts", "auth-local-guard.mjs"));
  const r = spawnSync(process.execPath, [join(dir, "scripts", "qa-run.mjs"), "--help"], { encoding: "utf8" });
  if (r.status !== 0) { console.error("a lone copy of qa-run.mjs does not start: " + r.stderr); process.exit(1); }
  '
  ```
  This passes on the unmodified tree by design (the anchors exist today); it is the regression guard for Tasks 1-3.

## Validation Commands

### Level 1 STATIC_ANALYSIS

```bash
set -euo pipefail
node --check plugins/relay/scripts/qa-run.mjs
node --input-type=module -e '
import { extractCitedTitles, normalizeTestCitation, titleMatchesTestcase, readJunitSuiteChains } from "./plugins/relay/scripts/qa-run.mjs";
for (const f of [extractCitedTitles, normalizeTestCitation, titleMatchesTestcase, readJunitSuiteChains]) {
  if (typeof f !== "function") { console.error("a helper is not exported"); process.exit(1); }
}
'
```

### Level 2 CONTENT_INVARIANTS

```bash
set -euo pipefail
# The frozen surfaces (AC-15) are byte-identical to HEAD (working tree vs HEAD).
if [ -n "$(git diff --name-only HEAD -- plugins/relay/agents/code-reviewer.md plugins/relay/agents/code-reviewer-semantic.md plugins/relay/commands/relay-implement.md plugins/relay/scripts/visual/capture.mjs)" ]; then
  echo "FAIL: a frozen surface changed"; exit 1
else
  echo "PASS: frozen surfaces untouched"
fi
# The report-producing command is untouched. Only files clean at HEAD are asserted here: phases 1-6 already
# modified qa-run.mjs, relay-qa-run.md and check files uncommitted, so a diff against HEAD cannot isolate this phase for them.
if [ -n "$(git diff --name-only HEAD -- plugins/relay/commands/relay-qa-report.md)" ]; then
  echo "FAIL: relay-qa-report.md changed"; exit 1
else
  echo "PASS: relay-qa-report.md untouched"
fi
# No forbidden .claude/PRPs reference introduced outside the quoted prohibition idiom.
if git diff --unified=0 HEAD -- plugins/relay/scripts/qa-run.mjs plugins/relay/commands/relay-qa-run.md | grep -E "^\+[^+]" | grep "\.claude/PRPs" | grep -qv "MUST NOT appear"; then
  echo "FAIL: forbidden .claude/PRPs reference introduced"; exit 1
else
  echo "PASS: no forbidden path reference introduced"
fi
```

### Level 3 INTEGRATION

```bash
set -euo pipefail
# The full static suite (28 checks, no new check file) must pass; its exit code propagates.
npm run validate
# The corpus, glob quoted, minus the two record-resolution tests whose pinned expectation this phase deliberately flips
# (routed to the test pair as EXISTING_TEST_UPDATED, see Notes). Every other test, including every mutation proof of the
# record-resolution file, must still pass.
node --test --test-skip-pattern='^(resolves pass, fail and unresolved per cited test file|path extraction: unparseable)' "scripts/validate/**/*.test.mjs"
```

## Acceptance Criteria

- **AC-A1 (PRD AC-14):** Given an automated-coverage case whose cited test names a `describe` block or test title, when the runner resolves it from the Test Runner's record, then only the JUnit testcases of the cited file whose name, class name, enclosing suite name or ` > ` segment equals that title decide the outcome (all titles of one `describe(...) › "..."` chain on the same testcase), so one failing `describe` fails only the cases citing it.
- **AC-A2 (PRD AC-14):** A cited title with no matching non-skipped testcase, or a title that follows no cited file, is not resolved from the record; the case routes exactly as before.
- **AC-A3 (PRD AC-14):** When the report cites only a file, resolution stays per file and the evidence records `granularity: file`; title-level resolution records `granularity: test` and a mix records `granularity: mixed`; a file-level `files` entry keeps its original keys.
- **AC-A4 (PRD AC-14):** The parser accepts, without any change to `/relay-qa-report` or its reports, the shapes the reports already carry: `describe("...")`, `it("...")` and `test("...")` calls, a `›` chain to a test title, `<path>::<title>` and `<path> > <title>` spans, and several titles or several files in one field.
- **AC-A5 (PRD AC-14):** `relay-qa-run.md`'s record-resolution section documents title-level resolution and `granularity`; `npm run validate` still passes.
- **AC-A6 (PRD AC-14):** Given a `praesto-sum`-shaped record in which one `describe` fails, only the cases citing that `describe` resolve `fail`; the cases citing the passing blocks of the same file resolve `pass`.
- **AC-A7 (PRD AC-15):** `plugins/relay/agents/code-reviewer.md`, `plugins/relay/agents/code-reviewer-semantic.md`, `plugins/relay/commands/relay-implement.md` and `plugins/relay/scripts/visual/capture.mjs` are byte-identical to their pre-feature content, `relay-qa-report.md` is untouched, the report is never written, and `OUTCOMES` is still exactly the four values.

R8b (PRD AC-N token check) is satisfied by the `(PRD AC-N)` tokens above; the criteria are phase-scoped slices of PRD AC-14 and AC-15. Task bodies cite them as: Task 1 delivers AC-A4 and the pure halves of AC-A1 and AC-A2; Task 2 delivers AC-A1, AC-A2, AC-A3 and AC-A6; Task 3 delivers AC-A5; Task 4 delivers AC-A7 (regression guard); AC-A7 is also held by the Level 2 frozen-surface check across all tasks.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| A title matches loosely and produces a false record-resolved `pass` | M | H | Exact, case-sensitive matching after whitespace collapse; no substring, prefix or dot/space-joined matching; every cited title must match at least one non-skipped testcase; a title that cannot be attached to a cited file leaves the case unresolved; Task 1's VALIDATE pins the negatives (`AC-1` vs `AC-10`, case, suite that does not enclose) |
| A framework's JUnit names cannot be split into `describe` segments (jest-junit default space-joined names, node:test with the older constant `classname="test"` and no suite nesting, dot-joined class names) | M | M | Such a title is unresolved (honest, routed as before), never guessed; web research confirms the formats vary by tool, version and configuration, and the plan does not read the target's reporter config. The dogfood (phase 8) shows which reports hit this |
| A pinned expectation of an existing test flips and the corpus goes red | H | M | Two tests are expected to flip (Notes); they are routed to the test pair as `EXISTING_TEST_UPDATED` and excluded by name from Level 3 only for exactly that reason; every anchor literal of the record-resolution file is kept byte-identical and Task 4 counts each exactly once |
| A new static sibling import or a changed once-only anchor breaks the tests that copy or mutate `qa-run.mjs` | M | H | All code stays inside `qa-run.mjs`; Task 2's end-to-end run and Task 4 start a lone copy with only the guard beside it |
| An unattached or foreign title narrows nothing and the case resolves at file level by mistake | L | H | Rule enforced in `resolveFromRecord`: any cited title with `path === null` or a path not among the extracted paths returns `null` before the JUnit is read; Task 2's case 11 pins it |
| The citation shapes in real reports differ from those assumed | M | M | The shapes were read from the real `praesto-sum` report (`describe("...")` plus a `›` test title, several describes, a second file for a "cron half"); the `super-ensino` report cites no test titles; unknown shapes stay unresolved. `TBD - needs validation` against the full `missed-sweep` report in the phase 8 dogfood |

## Notes

- **TDD routing (this plan, against the relay repo):** Current value of `tdd` in `docs/context/methodology.md`: **false**. Test-after ordering — when a test framework is declared, the test pair (test-writer/test-reviewer) authors and maintains the suite from the Acceptance Criteria above, after the Implementer + Code Review; with no framework declared, no tests are authored.
- **Test-file routing:** this phase's test-file creation and updates are routed through the `test-writer`/`test-reviewer` pair's lifecycle ledger (`/relay-write-test` → `/relay-test-write-review`), not authored by the Implementer — R-X is a blanket straight-fail on any test glob in the Implementer's diff. No task below and no `## Files to Change` row targets a test file, so this plan's `**VALIDATE**` commands exercise the change directly rather than invoking the test framework.
- **Existing tests this phase flips (for the test pair, as `EXISTING_TEST_UPDATED`, both in `scripts/validate/checks/qa-run-record-resolution.test.mjs`).** Both cite a title that matches no testcase of their fixture, and under AC-14 an unmatched title is no longer resolved:
  1. `resolves pass, fail and unresolved per cited test file, with evidence, a separate record_resolved count and driver-executed numbers that exclude them` (test lines 241-286): case 1 cites `` `test/a.test.mjs` — describe("AC-1") `` against testcases named `t1`, `t2`. It now routes `needs-human:NO_PLAN_ENTRY`, so the expected `outcomes` become `[ROUTED, RESOLVED_FAIL, ROUTED, ROUTED, RESOLVED_FAIL]`, `record_resolved` 2, `counts` `{ pass: 0, fail: 2, blocked: 0, 'needs-human': 3 }`, the summary lines `needs-human=3` and `record-resolved=2 (pass=0 fail=2)`, and the `evidenceOf(s, 0)` assertions (lines 260-268, 281-282's pass figure) have no evidence file to read. The test pair should keep the case's intent by renaming the fixture testcases so the title matches (for example name them `AC-1 > t1`) rather than weakening the assertion, and add a title-level case.
  2. `path extraction: unparseable or truncated citations leave the case unresolved, well-formed ones resolve` (test lines 487-510): the row `` `test/missed-sweep.test.ts` — describe("AC-1 …") › "…" `` (line 493) expects `RESOLVED_PASS`; its titles (`AC-1 …`, `…`) match no testcase, so it now routes `ROUTED` and the final `record_resolved` is 2, not 3. The row's purpose (the path extractor still parses the shape) is preserved by giving the fixture testcases matching names.
  Every other test of that file, including all `mutation:` tests, is expected to stay green because the anchor lines are byte-identical and a citation with no title takes the unchanged file-level path. If Level 3 shows any further failure, list it for the test pair the same way; never edit it as an Implementer task, and exclude it from Level 3 by name only for exactly that reason.
- **Decision recorded: `granularity` is a top-level key of the evidence value, not a key of every `files` entry.** The existing tests deep-compare `files` entries (`{ cited, testcases, failed }`), so a file-level entry must keep exactly those keys. A title-level entry adds `granularity: 'test'` and `titles`; the top-level `granularity` (`file`, `test` or `mixed`) is what AC-14 calls "the evidence records `granularity: file`".
- **Decision recorded: AND within one citation, OR across citations.** `describe("A") › "t"` names one test inside `A`, so both segments must match the same testcase (the union would let a failing sibling `t2` fail a case that cites only `t1`). `describe("A")` plus `describe("B")` cite two units, so their testcases are pooled, and each unit must match at least one non-skipped testcase.
- **Decision recorded: the field is normalized only for path extraction.** `normalizeTestCitation` turns `` `P::T` `` and `` `P > T` `` spans into `` `P` `` before `extractTestPaths` runs, so those spans (previously refused as path-like prose) now resolve; `extractTestPaths` and its truncated-tail scan are not edited, and a field with no such span is passed through byte-identical, so every existing fixture extracts the same paths.
- **Decision recorded: JUnit shapes supported.** vitest (`classname` = file path, `name` = `describe > test`), Playwright (` › ` joined names), and node:test with nested `<testsuite name>` (suite names are matched through `readJunitSuiteChains`). Not supported, by design: dot-joined class names and space-joined names (older node:test `classname="test"`, `jest-junit` defaults); a report citing a title for such a record stays unresolved. Per-file citation still works for every framework.
- **Anchors this phase must not disturb (from `qa-run-record-resolution.test.mjs` `mutatedCopy`, exactly-once).** `if (!isSchemaV1Record(rec)) return null;`, `if (existsSync(top)) return { abs: top, rel: \`${relDir}/record.json\` };`, `if (st.mtimeMs > generated + JUNIT_MTIME_SLACK_MS) return null;`, `if (Number.isNaN(generated)) return null;`, `if (new Set(hit.map((t) => t.loc)).size !== 1) return null;`, the `hit` filter expression, `if (tok !== '' && looksPathLike(tok)) refused = true;`, `if (ran.length === 0) return null;`, `if (cov !== 'automated') return null;`, the three `isSchemaV1Record` count/total lines, `!Number.isInteger(c[k]) || c[k] < 0`, the `RECORD_EXECUTED_OUTCOMES` line, `|| !isAbsolute(rec.artifacts.junit_xml)`, `failed: /<(failure|error)\b/.test(body),` and `best = Math.max(best, Number(ent.name));`. `qa-run.test.mjs`, `qa-run-contract.test.mjs`, `qa-run-layout.test.mjs` and `qa-run-kit-hardening.test.mjs` have no anchor in this region (found by the research pass over `resolveFromRecord`, `extractTestPaths` and `junit`), and the earlier phases' anchors outside this region are untouched. Task 4 and the lone-copy start check the ones that matter.
- **Recorded for the test pair.** New cases for: `extractCitedTitles` and `normalizeTestCitation` (every shape and the unattached-title case of Task 1's VALIDATE); `titleMatchesTestcase` (exact, segment, suite, no prefix, case); `readJunitSuiteChains` (nesting, self-closing, entities); and the Task 2 fixture as an end-to-end scenario (one failing `describe` fails only its cases, unmatched and unattached titles unresolved, `granularity` file, test and mixed, a node:test-shaped suite scope). The full corpus must be run with the quoted glob `node --test "scripts/validate/**/*.test.mjs"` after the ledger updates.
- The plan writer has no shell tool in this session: the VALIDATE commands were derived by reading the working tree and were not executed. The `parse` output is not used by these VALIDATEs (the report is written directly in the canonical layout, as `qa-run-record-resolution.test.mjs` does). Tasks 3 and 4 pass or fail by construction as described; Task 4 and Level 2/3 are regression guards that pass on the unmodified tree. If the shared parser needs a different heading shape for the fixture report, adjust the fixture, not the assertions.
- Release is out of scope: the cut follows the phase 8 dogfood.

- **Amendment 2026-10-06 (after implementation, before code review):** Level 3's exclusion of the two expected-flipped record-resolution tests used `--test-name-pattern` with a negative lookahead, which excluded nothing on this Node (the two tests ran and failed). It now uses `--test-skip-pattern` with the same two literal prefixes, which the orchestrator verified skips exactly those two (qa-run-record-resolution.test.mjs: 60 run, 60 pass). Intent and scope are unchanged; the two tests remain the test pair's EXISTING_TEST_UPDATED work.

*Generated: 2026-10-06*
*Approved: 2026-10-06*
*Implemented: 2026-10-06*
*Status: IMPLEMENTED*
