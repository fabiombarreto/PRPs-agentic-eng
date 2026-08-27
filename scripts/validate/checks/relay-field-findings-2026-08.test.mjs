// @ts-check
/**
 * Regression tests for the eleven field-reported defects fixed on 2026-08-20.
 *
 * Source: a field session driving an 8-phase `visual_first_approval: human`
 * PRD through `/relay-execute` against a real React project (`spe-cms`,
 * 2026-08-18/19), whose findings were measured rather than inferred. The two
 * governing entries are `docs/decisions.md` [2026-08-20] "The visual gate
 * measures drift from the last approved capture" and [2026-08-20] "Six
 * field-reported pipeline defects fixed at the surface that produced them".
 *
 * ENVIRONMENT-DEPENDENCY NOTE (why these are content-invariant rather than
 * behavioral): `compare.mjs` imports `pngjs` and `pixelmatch`, which live in
 * the deliberately-separate `plugins/relay/scripts/visual/package.json` and
 * are never installed by a root `npm install` — the identical constraint
 * `figma-track-phase6.test.mjs` documents at length for the same module. So
 * the comparison-basis machinery is pinned at the source level, exactly as
 * that suite pins the pre-existing entry shape. Everything else under test
 * here is prompt text in markdown, where content-invariance is the only
 * available form.
 *
 * Existing-coverage scan: `figma-track-phase6.test.mjs` covers `compare.mjs`'s
 * entry shape, its AA-tolerance and its never-mutates guard (all three updated
 * in this same change, not duplicated here); `figma-visual-first-track-
 * phase5.test.mjs` covers Phase A.3.4's terminal routing including the
 * `DEGRADED_NO_BASELINE` carve-out added to the VISUAL_GATE_BLOCKED
 * recommendation. Neither reads `relay-visual-approve.md`, `test-runner.md`'s
 * constraints, `relay-test.md`'s Final summary, `plan-writer.md`'s Step 4.4.*,
 * `plan-reviewer.md`'s R8b, `plan-template.md`'s extensions, or
 * `mock-sentinels.md` — the properties below are new territory.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Normalizes CRLF -> LF once, here, so every assertion below (including the
// literal `\n}\n` function-boundary slice in the "never-throwing reader"
// test) is checkout-line-ending-agnostic. Without this, a CRLF checkout
// (this repo has `core.autocrlf=true` and no `.gitattributes`, so a Windows
// checkout materializes tracked LF source as CRLF) makes `indexOf('\n}\n')`
// return -1, degenerating the sliced function body to a 2-character string
// and failing assertions that should pass. Verified safe for every OTHER
// assertion in this file: all but one route through `collapseWs` (which
// already collapses \r\n to a single space) or match a single-line
// substring with no embedded newline; the one raw-content regex
// (`/^#### R-COH-/gm`) is unaffected because `^` in multiline mode matches
// immediately after any line-terminator character, `\r` included, so
// normalizing away the `\r` does not shift which positions satisfy `^`.
const read = (p) => readFileSync(resolve(process.cwd(), p), 'utf8').replace(/\r\n/g, '\n');
const collapseWs = (s) => s.replace(/\s+/g, ' ').trim();

const COMPARE = 'plugins/relay/scripts/visual/compare.mjs';
const CAPTURE = 'plugins/relay/scripts/visual/capture.mjs';
const VERIFIER = 'plugins/relay/agents/visual-verifier.md';
const VISUAL_APPROVE = 'plugins/relay/commands/relay-visual-approve.md';
const IMPLEMENT = 'plugins/relay/commands/relay-implement.md';
const TEST_RUNNER = 'plugins/relay/agents/test-runner.md';
const RELAY_TEST = 'plugins/relay/commands/relay-test.md';
const PLAN_WRITER = 'plugins/relay/agents/plan-writer.md';
const PLAN_REVIEWER = 'plugins/relay/agents/plan-reviewer.md';
const PLAN_TEMPLATE = 'plugins/relay/resources/plan-template.md';
const SENTINELS = 'plugins/relay/resources/mock-sentinels.md';

// ---------------------------------------------------------------------------
// Finding 1 — the comparison basis. The measured defect: against the Figma
// export, two broken layouts scored BELOW the correct one, so the metric's
// ordering is inverted and no threshold separates them.
// ---------------------------------------------------------------------------

test('finding 1: compare.mjs resolves an approved baseline before falling back to the Figma export, and the fallback is never reported as PASS/FAIL', () => {
  const content = read(COMPARE);
  const collapsed = collapseWs(content);

  assert.ok(
    collapsed.includes("return { basis: 'figma-reference', comparisonPath: frame.ref_png };"),
    'expected the Figma export to be the LAST resort of resolveComparisonBasis, not its only basis'
  );
  assert.ok(
    collapsed.includes(
      "const status = basis === 'figma-reference' ? 'NO_BASELINE' : (diffPercent <= frame.diff_threshold ? 'PASS' : 'FAIL');"
    ),
    'expected a figma-reference diff to yield NO_BASELINE — never PASS/FAIL, whose ordering the field measurement disproved'
  );
  assert.ok(
    /advisory_reason\s*=/.test(content),
    'expected every NO_BASELINE entry to carry an advisory_reason stating the number does not gate'
  );
});

test('finding 1: the approved-baseline registry is read through a never-throwing reader, so a missing or corrupt registry degrades to NO_BASELINE instead of failing the run', () => {
  const content = read(COMPARE);
  assert.ok(content.includes('export async function readBaselineRegistry(baselineDir)'));
  const body = content.slice(content.indexOf('export async function readBaselineRegistry'));
  const fn = body.slice(0, body.indexOf('\n}\n') + 3);
  assert.ok(fn.includes('catch') && fn.includes('return {}'), 'expected the registry reader to swallow read/parse failure and return {}');
  assert.ok(!/throw /.test(fn), 'expected the registry reader never to throw');
});

test('finding 1: compare()\'s CLI and signature both accept a baseline directory, so the caller can supply one', () => {
  const content = read(COMPARE);
  assert.ok(content.includes('export async function compare(manifestPath, capturedDir, reportPath, baselineDir = null)'));
  assert.ok(content.includes('<reportPath> [baselineDir]'), 'expected the usage string to document the new argument');
});

test('finding 1: the field measurement that motivated the basis change is recorded in the module, not just in decisions.md', () => {
  const collapsed = collapseWs(read(COMPARE));
  for (const number of ['2.6035%', '2.4614%', '2.5139%', '0.8963%', '1.1625%']) {
    assert.ok(collapsed.includes(number), `expected the measured figure ${number} to be recorded beside the code it justifies`);
  }
});

// ---------------------------------------------------------------------------
// Finding 2 — pixelmatch's 0.1 tolerance is blind to low-contrast difference.
// ---------------------------------------------------------------------------

test('finding 2: the pixelmatch colour tolerance is basis-dependent and per-frame overridable, tight against a deterministic baseline and unchanged against the Figma export', () => {
  const content = read(COMPARE);
  const collapsed = collapseWs(content);

  assert.ok(content.includes('const BASELINE_PIXELMATCH_THRESHOLD = 0.02;'));
  assert.ok(content.includes('const REFERENCE_PIXELMATCH_THRESHOLD = 0.1;'));
  assert.ok(
    collapsed.includes(
      "frame.pixelmatch_threshold ?? (basis === 'approved-baseline' ? BASELINE_PIXELMATCH_THRESHOLD : REFERENCE_PIXELMATCH_THRESHOLD);"
    ),
    'expected the tolerance to be selected by basis, with a per-frame override taking precedence'
  );
  assert.ok(collapsed.includes('24.6%'), 'expected the low-contrast blindness measurement to be recorded beside the constants');
});

// ---------------------------------------------------------------------------
// Finding 3 — the diff overlay was computed and discarded.
// ---------------------------------------------------------------------------

test('finding 3: every diffed frame writes an inspectable diff overlay PNG and records its path in the report entry', () => {
  const content = read(COMPARE);
  const collapsed = collapseWs(content);

  assert.ok(content.includes('await writeFile(outPath, PNG.sync.write(diffPng));'), 'expected the diff buffer to be persisted, not discarded');
  assert.ok(collapsed.includes("return path.join(path.dirname(reportPath), 'diff', frameFilename(nodeId));"), 'expected the overlay to land beside the fidelity report');
  assert.ok(collapsed.includes('diff_png: writtenDiffPath,'), 'expected the entry to name the overlay it wrote');
  assert.ok(collapsed.includes('diff_png: null,'), 'expected entries that never got as far as a diff to report diff_png: null explicitly');
});

// ---------------------------------------------------------------------------
// Finding 4 — capture.mjs had no baseURL while Design Specs write relative routes.
// ---------------------------------------------------------------------------

test('finding 4: capture.mjs sets baseURL on every browser context and defaults the dev server to 127.0.0.1 rather than localhost', () => {
  const content = read(CAPTURE);
  const collapsed = collapseWs(content);

  assert.ok(content.includes("const DEFAULT_DEV_SERVER_URL = 'http://127.0.0.1:3000';"), 'expected the IPv4 literal default');
  assert.ok(!content.includes("const DEFAULT_DEV_SERVER_URL = 'http://localhost:3000';"));
  assert.ok(collapsed.includes('async function captureFrame(browser, frame, outputDir, baseURL)'), 'expected the frame capture to receive a baseURL');
  assert.ok(collapsed.includes('baseURL,'), 'expected baseURL to be set on the context options');
  assert.ok(collapsed.includes('const result = await captureFrame(browser, frame, outputDir, devServerUrl);'), 'expected the resolved dev-server URL to be threaded through as the baseURL');
});

// ---------------------------------------------------------------------------
// Finding 5 — the verifier inferred an element's absence from an unmoved number.
// ---------------------------------------------------------------------------

test('finding 5: visual-verifier is forbidden from inferring an element\'s presence or absence from diff_percent, and must read the diff overlay first', () => {
  const collapsed = collapseWs(read(VERIFIER));
  assert.ok(
    collapsed.includes("**Never infer an element's presence or absence from `diff_percent`.**"),
    'expected the hard constraint that produced this finding'
  );
  assert.ok(collapsed.includes('`Read` the frame’s `diff_png`') || collapsed.includes('`Read` the frame\'s `diff_png`'), 'expected the constraint to name the concrete alternative — reading the overlay');
});

test('finding 1 + 5: visual-verifier derives a feature-level baseline directory, passes it to compare.mjs, and classifies NO_BASELINE onto the degradation ladder rather than as a pass', () => {
  const content = read(VERIFIER);
  const collapsed = collapseWs(content);

  assert.ok(collapsed.includes('### Deriving the approved-baseline directory'), 'expected an explicit baseline-path derivation section');
  assert.ok(collapsed.includes('one directory per FEATURE, not per phase and not per attempt'), 'expected the feature-level scoping rationale');
  assert.ok(collapsed.includes('<fidelity_report_path> <baseline_dir>`'), 'expected baseline_dir to be passed to compare.mjs');
  assert.ok(collapsed.includes('set `rung = "DEGRADED_NO_BASELINE"` and return `VISUAL_DEGRADED`'), 'expected NO_BASELINE frames to degrade, never to pass');
  assert.ok(collapsed.includes('**Reading a `NO_BASELINE` frame as a pass.**'), 'expected the matching anti-pattern entry');
});

test('finding 1: /relay-visual-approve promotes approved captures to baselines — on the approval branch only', () => {
  const content = read(VISUAL_APPROVE);
  const collapsed = collapseWs(content);

  assert.ok(collapsed.includes('PRPs/reports/<feature>/visual-baseline/index.json'), 'expected the registry path');
  assert.ok(
    collapsed.includes('the rejection branch never touches it (a rejected capture must never become the baseline that later runs are measured against)'),
    'expected an explicit statement that rejection never promotes'
  );
  assert.ok(collapsed.includes('The registry stores POINTERS, not copies'), 'expected the Bash-free pointer rationale');
  assert.ok(collapsed.includes('never a `FAIL` frame'), 'expected FAIL frames to be excluded from promotion');
});

// ---------------------------------------------------------------------------
// Finding 6 — run.json shape and ownership.
// ---------------------------------------------------------------------------

test('finding 6: test-runner is explicitly forbidden from writing run.json or using run-level vocabulary', () => {
  const collapsed = collapseWs(read(TEST_RUNNER));
  assert.ok(collapsed.includes('**Never write `run.json`, and never use run-level vocabulary.**'));
  assert.ok(collapsed.includes('`post-green-reviewer` refuses to review a `run.json` whose `outcome` is not `GREEN`'), 'expected the constraint to name the observed downstream consequence');
});

test('finding 6: /relay-test states that the command owns run.json, overwrites an attempt-shaped file, and archives a per-phase copy', () => {
  const collapsed = collapseWs(read(RELAY_TEST));
  assert.ok(collapsed.includes('**written by this command, never by the `test-runner` agent**'));
  assert.ok(collapsed.includes('overwrite it wholesale with the run-level shape below rather than merging'));
  assert.ok(collapsed.includes('**Per-phase archive.**'));
  assert.ok(collapsed.includes('"phase": <N | null>,'), 'expected the run-level shape to record which phase produced it');
  assert.ok(collapsed.includes('never guess a number'), 'expected the no-phase case to be explicit rather than inferred');
});

// ---------------------------------------------------------------------------
// Finding 7 — R8b checks existence, not pertinence, and can deadlock.
// ---------------------------------------------------------------------------

test('finding 7: R8b names the source PRD as the cause when it and R-COH-AC-TASK-DECOUPLED are mutually unsatisfiable', () => {
  const collapsed = collapseWs(read(PLAN_REVIEWER));
  assert.ok(collapsed.includes('**Impasse detection (blocking, names the PRD as the cause).**'));
  assert.ok(collapsed.includes('MUST open with the literal token `PRD_AC_GAP:`'), 'expected a machine-greppable marker for the impasse');
  assert.ok(collapsed.includes('Re-authoring the plan cannot fix this.'), 'expected the verdict to tell the writer not to look for a local fix');
});

test('finding 7: a doubtful AC citation is recorded without blocking, and adds no rubric row', () => {
  const content = read(PLAN_REVIEWER);
  const collapsed = collapseWs(content);
  assert.ok(collapsed.includes('**Pertinence (recorded, never blocking).**'));
  assert.ok(collapsed.includes('PERTINENCE_DOUBT:'), 'expected the recorded marker');
  assert.ok(collapsed.includes('This adds no rubric row, changes no verdict, and never blocks'));

  // The repo derives rubric counts from live headings; the additions above must
  // not have introduced a new one.
  const cohHeadings = (content.match(/^#### R-COH-/gm) || []).length;
  assert.equal(cohHeadings, 14, 'expected the R-COH-* heading count to be unchanged at its pre-change value of 14 — the R8b additions are deliberately not new check ids, so the derived rubric arithmetic is untouched');
});

// ---------------------------------------------------------------------------
// Finding 8 — the deferral paragraph was never emitted proactively.
// ---------------------------------------------------------------------------

test('finding 8: plan-writer emits the test-pair-deferral paragraph by default, and the pre-emission self-check verifies it', () => {
  const collapsed = collapseWs(read(PLAN_WRITER));
  assert.ok(collapsed.includes('### Step 4.4.quater — Test-pair deferral note (emit by default)'));
  assert.ok(
    collapsed.includes('**When `test_frameworks` is non-empty AND condition (b) holds, emit the paragraph for (a) — always, by default.**'),
    'expected default emission, not an exceptional one'
  );
  assert.ok(collapsed.includes('**The test-pair deferral note is present whenever it applies**'), 'expected the self-check item');
  assert.ok(
    collapsed.includes('never "fix" a framework-mismatch failure by having the Implementer author spec files'),
    'expected the observed R-X-violating escape to be named and forbidden'
  );
});

// ---------------------------------------------------------------------------
// Finding 9 — sentinel text trips the visual purity gate.
// ---------------------------------------------------------------------------

test('finding 9: mock-sentinels documents the elided-path form that keeps a sentinel from tripping a visual phase\'s own purity gate', () => {
  const collapsed = collapseWs(read(SENTINELS));
  assert.ok(collapsed.includes('### Naming the real source without tripping the purity gate'));
  assert.ok(collapsed.includes('real source: PUT .../practice-exams/{id}'), 'expected the elided form to be shown, not just described');
});

// ---------------------------------------------------------------------------
// Finding 10 — a VALIDATE that matches a declaration validates nothing.
// ---------------------------------------------------------------------------

test('finding 10: the plan template and plan-writer both require a VALIDATE to exercise the effect rather than match the declaration', () => {
  const template = collapseWs(read(PLAN_TEMPLATE));
  assert.ok(template.includes('8. **Effect over declaration.**'));
  assert.ok(template.includes("require.resolve('playwright')"), 'expected the effect-exercising alternative to be shown concretely');
  assert.ok(template.includes('ERR_MODULE_NOT_FOUND'), 'expected the observed failure to be recorded as the rationale');

  const writer = collapseWs(read(PLAN_WRITER));
  assert.ok(writer.includes('### Step 4.4.quinquies — VALIDATE exercises the effect'));
  assert.ok(writer.includes('the `**VALIDATE**` is the only thing standing between a declared change and a broken one'), 'expected the deferral-branch coupling to be stated');
});

// ---------------------------------------------------------------------------
// Finding 11 — the dispute halt claimed B7/B8 was unshipped.
// ---------------------------------------------------------------------------

test('finding 11: the DISPUTE_UPHELD_TEST_WRONG halt names the shipped test pair and its concrete routing, and no longer claims B7/B8 is deferred', () => {
  const content = read(IMPLEMENT);
  const collapsed = collapseWs(content);

  assert.ok(collapsed.includes('The test pair (B7/B8) HAS shipped'), 'expected the halt to state the pair exists');
  assert.ok(!collapsed.includes('When TDD Writer (B7) ships, the Task dispatch contract will'), 'expected the obsolete when-B7-ships sentence to be gone');
  assert.ok(collapsed.includes('run /relay-write-test <plan_path>'), 'expected the sanctioned routing to name the real command');
  assert.ok(collapsed.includes('/relay-test-write-review <plan_path> to re-approve the suite'), 'expected the reviewer half of the routing');
  assert.ok(
    collapsed.includes('Automatic in-loop bounce-back to the pair is still deferred'),
    'expected the remaining deferral to be stated honestly rather than dropped'
  );
});
