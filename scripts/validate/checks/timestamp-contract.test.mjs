// @ts-check
/**
 * Unit tests for the check — timestamp-contract — the pure
 * `checkTimestampContract` function, the `runTimestampContractCheck` thin
 * wrapper, and the `WATCHED_FILES` registry export, all from
 * scripts/validate/checks/timestamp-contract.mjs.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * shipped-and-passing production module, mirroring
 * scripts/validate/checks/feedback-chain.test.mjs's shape: synthetic
 * in-memory fixtures exercise the pure function's assertion classes, plus
 * one real-wrapper test against the actual repository tree, plus one
 * registration test against scripts/validate/index.mjs.
 *
 * Source plan (description mode — no source PRD):
 *   PRPs/plans/add-an-11th-static-check-to-scriptsvalidate-that.plan.md
 *
 * Authored by the test pair under R-X strict (docs/decisions.md
 * [2026-07-12] / [2026-05-06]): the Implementer never touches this file.
 *
 * Traceability (in-scope AC-A12, which itself requires covering every
 * property asserted by AC-A1..AC-A6 — AC-A7..AC-A11 are documentation
 * scope, out of scope here):
 *   AC-A1 — pure `checkTimestampContract` + thin `runTimestampContractCheck`
 *     wrapper, shared `{ name, ok, findings, notes }` contract shape.
 *     Covered by the baseline sanity test, the real-wrapper test, and the
 *     robustness test (never a throw).
 *   AC-A2 — registry-driven, with the three deliberate exclusions carried
 *     as documented absences. Covered by the two WATCHED_FILES tests.
 *   AC-A3 — per-reviewer review_started_at / section / T00:00:00 prose
 *     assertions, and per-command date -u / review_started_at assertions.
 *     Covered by classes A, B, C, E below.
 *   AC-A4 — the load-bearing capability-derived fallback branch, and the
 *     negation-trap discriminator proving the degraded-flag assertion is
 *     non-vacuous. Covered by classes D1-D4 below.
 *   AC-A5 — scripts/validate/index.mjs registration. Covered by the
 *     registration test.
 *   AC-A6 — the real-output jsonl assertion (post-marker T00:00:00 without
 *     timestamp_degraded fails; pre-marker is exempt; absent/unparseable
 *     marker skips with a visible note). Covered by class F below.
 *
 * EXISTING_TEST_UPDATED (source plan, description mode — no source PRD):
 *   PRPs/plans/close-the-consumer-half-of-the-v0250-reviewstartedat.plan.md
 * That plan's own AC-A7/AC-A8/AC-A9 (distinct numbering from the AC-A1..AC-A6
 * cited above, which trace to the earlier plan that created this check) add
 * the CONSUMERS registry asserting a registered consumer references
 * `timestamp_degraded` in EXECUTABLE code, not merely in a comment:
 *   AC-A7 — WATCHED_FILES includes the registered consumer
 *     scripts/efficiency.mjs. Covered by extending the existing WATCHED_FILES
 *     inclusion test below (not a new test) plus class J's baseline test.
 *   AC-A8 — the consumer assertion fails a comment-only reference (both `//`
 *     and `/* *\/` forms) and passes an executable-code reference. Covered by
 *     class J below.
 *   AC-A9 — registry omissions are carried as a comment (scripts/eval.mjs and
 *     .claude/commands/efficiency-report.md), never a silent gap. Covered by
 *     a dedicated test below: both paths are asserted absent from
 *     WATCHED_FILES AND asserted present in the module's own source text
 *     (the CONSUMERS docblock), so removing either the exclusion or its
 *     documented justification fails this test.
 *
 * Run: node --test scripts/validate/checks/timestamp-contract.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

import { checkTimestampContract, runTimestampContractCheck, WATCHED_FILES } from './timestamp-contract.mjs';

const INDEX_PATH = 'scripts/validate/index.mjs';

// ---------------------------------------------------------------------------
// Registered reviewer paths (module REVIEWERS registry — three Bash-capable,
// four clockless, confirmed against each real file's own `tools:` line).
// ---------------------------------------------------------------------------
const CODE_REVIEWER = 'plugins/relay/agents/code-reviewer.md'; // Bash
const DOCS_REVIEWER = 'plugins/relay/agents/docs-reviewer.md'; // Bash
const TEST_REVIEWER = 'plugins/relay/agents/test-reviewer.md'; // Bash
const PLAN_REVIEWER = 'plugins/relay/agents/plan-reviewer.md'; // clockless
const PRD_REVIEWER = 'plugins/relay/agents/prd-reviewer.md'; // clockless
const DESIGN_MAP_REVIEWER = 'plugins/relay/agents/design-map-reviewer.md'; // clockless
const DESIGN_SPEC_REVIEWER = 'plugins/relay/agents/design-spec-reviewer.md'; // clockless

// Registered dispatching command paths (module COMMANDS registry).
const RELAY_PLAN_REVIEW_CMD = 'plugins/relay/commands/relay-plan-review.md';
const RELAY_CODE_REVIEW_CMD = 'plugins/relay/commands/relay-code-review.md';
const RELAY_TEST_WRITE_REVIEW_CMD = 'plugins/relay/commands/relay-test-write-review.md';
const RELAY_IMPLEMENT_CMD = 'plugins/relay/commands/relay-implement.md';
const RELAY_PRD_CMD = 'plugins/relay/commands/relay-prd.md';
const RELAY_APPROVE_CMD = 'plugins/relay/commands/relay-approve.md';
const RELAY_DESIGN_MAP_CMD = 'plugins/relay/commands/relay-design-map.md';
const RELAY_DESIGN_SPEC_CMD = 'plugins/relay/commands/relay-design-spec.md';

// ---------------------------------------------------------------------------
// Synthetic fixture templates. Deliberately NOT copied verbatim from the
// real prompt files — these fixtures exercise the check logic itself,
// independent of the real files' exact wording (that real-content assertion
// lives in the real-wrapper test near the bottom). Each template is built so
// every load-bearing token (`review_started_at`, `T00:00:00`,
// `date -u +%Y-%m-%dT%H:%M:%SZ`, `timestamp_degraded`) appears on exactly one
// line, so a single-line mutation isolates exactly one assertion class.
// ---------------------------------------------------------------------------

function bashReviewerContent(name) {
  return `---
name: ${name}
tools: Read, Write, Bash
---

# ${name}

## Inputs

- \`review_started_at\`: the UTC instant captured by the dispatching command, forwarded through unchanged.

### Timestamp discipline (mandatory)

The jsonl verdict's timestamp field MUST carry the real captured instant, written through verbatim as a full UTC value, never fabricated. \`2026-07-31T00:00:00\` is an explicit example of an unacceptable value -- a T00:00:00 component means the instant was fabricated rather than observed.

If the instant was not supplied, obtain it directly with \`date -u +%Y-%m-%dT%H:%M:%SZ\` before appending -- this agent has Bash and never sets \`timestamp_degraded\`.

### Step 4.2 -- Append-only jsonl write

Unrelated prose about the write recipe that must not be touched by any mutation above.
`;
}

function clocklessReviewerContent(name) {
  return `---
name: ${name}
tools: Read, Edit, Write
---

# ${name}

## Inputs

- \`review_started_at\`: the UTC instant captured by the dispatching command, forwarded through unchanged.

### Timestamp discipline (mandatory)

The jsonl verdict's timestamp field MUST carry the real captured instant, written through verbatim as a full UTC value, never fabricated. \`2026-07-31T00:00:00\` is an explicit example of an unacceptable value -- a T00:00:00 component means the instant was fabricated rather than observed.

If the instant was not supplied, append the verdict anyway and add \`"timestamp_degraded": true\` to that same JSON object so the gap is visible rather than silent.

### Step 4.2 -- Append-only jsonl write

Unrelated prose about the write recipe that must not be touched by any mutation above.
`;
}

function commandContent(cmdName, agentDesc) {
  return `# /${cmdName}

Capture the dispatch instant immediately before invoking the agent: \`date -u +%Y-%m-%dT%H:%M:%SZ\`.

Dispatch ${agentDesc} with \`review_started_at\` set to the instant captured immediately above.
`;
}

// ---------------------------------------------------------------------------
// CONSUMERS registry fixture (class J below). Registered separately from
// BASELINE_FILES above -- the CONSUMERS loop in checkTimestampContract is
// independent of the REVIEWERS/COMMANDS loops, so isolating it in its own
// `files: { [EFFICIENCY_MJS]: ... }` map mirrors class F's isolation
// pattern for the jsonl-output assertion. Deliberately NOT copied verbatim
// from the real scripts/efficiency.mjs -- this fixture exercises the
// comment-stripping assertion itself, independent of the real file's exact
// wording (the real file's own compliance is exercised end to end by
// scripts/efficiency.test.mjs, not here).
// ---------------------------------------------------------------------------
const EFFICIENCY_MJS = 'scripts/efficiency.mjs';

// Compliant baseline: references timestamp_degraded in executable code that
// survives comment-stripping. Every class J test below is a mutation of
// this SAME string, never an independently-authored fixture.
const EFFICIENCY_MJS_CONTENT = `// synthetic stand-in for scripts/efficiency.mjs, isolated to exercise only
// the CONSUMERS assertion (Assertion 6) in checkTimestampContract, below.
export function hasDegradedTimestamp(entry) {
  return entry.timestamp_degraded === true;
}
`;

const BASELINE_FILES = {
  [CODE_REVIEWER]: bashReviewerContent('code-reviewer'),
  [DOCS_REVIEWER]: bashReviewerContent('docs-reviewer'),
  [TEST_REVIEWER]: bashReviewerContent('test-reviewer'),
  [PLAN_REVIEWER]: clocklessReviewerContent('plan-reviewer'),
  [PRD_REVIEWER]: clocklessReviewerContent('prd-reviewer'),
  [DESIGN_MAP_REVIEWER]: clocklessReviewerContent('design-map-reviewer'),
  [DESIGN_SPEC_REVIEWER]: clocklessReviewerContent('design-spec-reviewer'),
  [RELAY_PLAN_REVIEW_CMD]: commandContent('relay-plan-review', 'plan-reviewer'),
  [RELAY_CODE_REVIEW_CMD]: commandContent('relay-code-review', 'code-reviewer'),
  [RELAY_TEST_WRITE_REVIEW_CMD]: commandContent('relay-test-write-review', 'test-reviewer'),
  [RELAY_IMPLEMENT_CMD]: commandContent('relay-implement', 'implementer'),
  [RELAY_PRD_CMD]: commandContent('relay-prd', 'prd-reviewer'),
  [RELAY_APPROVE_CMD]: commandContent('relay-approve', 'docs-reviewer'),
  [RELAY_DESIGN_MAP_CMD]: commandContent('relay-design-map', 'design-map-reviewer'),
  [RELAY_DESIGN_SPEC_CMD]: commandContent('relay-design-spec', 'design-spec-reviewer'),
};

// ---------------------------------------------------------------------------
// Baseline sanity — every fixture above satisfies every prose assertion
// class simultaneously. Every mutation test below mutates exactly one
// property of this baseline.
// ---------------------------------------------------------------------------

test('checkTimestampContract: ok:true with zero findings when every registered reviewer and command satisfies every prose invariant (baseline fixture)', () => {
  const result = checkTimestampContract({ files: BASELINE_FILES, jsonlEntries: [], marker: null });

  assert.equal(result.name, 'timestamp-contract');
  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

// ---------------------------------------------------------------------------
// AC-A2 — registry-driven WATCHED_FILES: every registered reviewer and
// command is present, deduplicated, and the three deliberately excluded
// agents/commands are absent.
// ---------------------------------------------------------------------------

test('WATCHED_FILES exports every registered reviewer and dispatching command path exactly once', () => {
  assert.ok(Array.isArray(WATCHED_FILES));
  for (const path of Object.keys(BASELINE_FILES)) {
    assert.ok(WATCHED_FILES.includes(path), `expected WATCHED_FILES to include ${path}`);
  }
  // AC-A7 (close-the-consumer-half... plan) -- the CONSUMERS registry
  // addition. Extends this existing shape test rather than duplicating it.
  assert.ok(WATCHED_FILES.includes(EFFICIENCY_MJS), `expected WATCHED_FILES to include ${EFFICIENCY_MJS}`);
  assert.equal(new Set(WATCHED_FILES).size, WATCHED_FILES.length, 'WATCHED_FILES must not carry duplicates');
});

test('WATCHED_FILES does not include the three deliberately excluded agents/commands (post-green-reviewer, code-reviewer-semantic, relay-execute)', () => {
  const excluded = [
    'plugins/relay/agents/post-green-reviewer.md',
    'plugins/relay/agents/code-reviewer-semantic.md',
    'plugins/relay/commands/relay-execute.md',
  ];
  for (const path of excluded) {
    assert.ok(!WATCHED_FILES.includes(path), `expected WATCHED_FILES to NOT include the deliberately excluded ${path}`);
  }
});

// ---------------------------------------------------------------------------
// AC-A9 (close-the-consumer-half... plan) -- CONSUMERS registry omissions
// are carried as an explanatory comment, never a silent gap. Mirrors the
// WATCHED_FILES-exclusion test immediately above, extended with a second
// assertion that the module's own source text documents WHY each path is
// excluded, so deleting the justification (while leaving the exclusion
// itself intact) is caught too.
// ---------------------------------------------------------------------------

test('WATCHED_FILES does not include the two deliberately excluded CONSUMERS-scope files (scripts/eval.mjs, .claude/commands/efficiency-report.md), and the module source documents why', () => {
  const excludedConsumers = ['scripts/eval.mjs', '.claude/commands/efficiency-report.md'];
  for (const path of excludedConsumers) {
    assert.ok(!WATCHED_FILES.includes(path), `expected WATCHED_FILES to NOT include the deliberately excluded consumer ${path}`);
  }

  const moduleSource = readFileSync(resolve('scripts/validate/checks/timestamp-contract.mjs'), 'utf-8');
  for (const path of excludedConsumers) {
    assert.ok(
      moduleSource.includes(path),
      `expected the module's CONSUMERS docblock to name ${path} as a deliberate, reasoned exclusion, not a silent gap`,
    );
  }
});

// ---------------------------------------------------------------------------
// Class A (AC-A3) — a registered reviewer that does not declare
// review_started_at.
// ---------------------------------------------------------------------------

test('checkTimestampContract: reports a registered reviewer that does not declare a review_started_at input', () => {
  const mutated = BASELINE_FILES[CODE_REVIEWER].replace(
    '- `review_started_at`: the UTC instant captured by the dispatching command, forwarded through unchanged.\n',
    '',
  );
  assert.notEqual(mutated, BASELINE_FILES[CODE_REVIEWER], 'fixture precondition: the Inputs bullet must exist verbatim in the baseline');
  assert.ok(!mutated.includes('review_started_at'));

  const files = { ...BASELINE_FILES, [CODE_REVIEWER]: mutated };
  const result = checkTimestampContract({ files, jsonlEntries: [], marker: null });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /does not declare a review_started_at input/);
  assert.equal(result.findings[0].file, CODE_REVIEWER);
});

// ---------------------------------------------------------------------------
// Class B (AC-A3) — a registered reviewer with no
// "### Timestamp discipline (mandatory)" section.
// ---------------------------------------------------------------------------

test('checkTimestampContract: reports a registered reviewer with no "### Timestamp discipline (mandatory)" section', () => {
  const mutated = BASELINE_FILES[PRD_REVIEWER].replace('### Timestamp discipline (mandatory)\n\n', '');
  assert.notEqual(mutated, BASELINE_FILES[PRD_REVIEWER], 'fixture precondition: the heading must exist verbatim in the baseline');

  const files = { ...BASELINE_FILES, [PRD_REVIEWER]: mutated };
  const result = checkTimestampContract({ files, jsonlEntries: [], marker: null });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /no "### Timestamp discipline \(mandatory\)" section found/);
  assert.equal(result.findings[0].file, PRD_REVIEWER);
});

// ---------------------------------------------------------------------------
// Class C (AC-A3) — a section that does not name T00:00:00 as unacceptable.
// ---------------------------------------------------------------------------

test('checkTimestampContract: reports a registered reviewer whose section does not name T00:00:00 as explicitly unacceptable', () => {
  const sentence =
    'The jsonl verdict\'s timestamp field MUST carry the real captured instant, written through verbatim as a full UTC value, never fabricated. `2026-07-31T00:00:00` is an explicit example of an unacceptable value -- a T00:00:00 component means the instant was fabricated rather than observed.';
  const replacement =
    'The jsonl verdict\'s timestamp field MUST carry the real captured instant, written through verbatim as a full UTC value, never fabricated.';
  const mutated = BASELINE_FILES[TEST_REVIEWER].replace(sentence, replacement);
  assert.notEqual(mutated, BASELINE_FILES[TEST_REVIEWER], 'fixture precondition: the T00:00:00 sentence must exist verbatim in the baseline');
  assert.ok(!mutated.includes('T00:00:00'));

  const files = { ...BASELINE_FILES, [TEST_REVIEWER]: mutated };
  const result = checkTimestampContract({ files, jsonlEntries: [], marker: null });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /Timestamp discipline section does not name T00:00:00 as explicitly unacceptable/);
  assert.equal(result.findings[0].file, TEST_REVIEWER);
});

// ---------------------------------------------------------------------------
// Class D (AC-A4) — THE LOAD-BEARING CLASS. Four distinct tests.
// ---------------------------------------------------------------------------

// D1 — a Bash-capable reviewer instructed to SET timestamp_degraded fails.
test('checkTimestampContract: D1 -- a Bash-capable reviewer instructed to SET timestamp_degraded fails, naming the specific violation', () => {
  const mutated = BASELINE_FILES[DOCS_REVIEWER].replace(
    'this agent has Bash and never sets `timestamp_degraded`',
    'this agent must add "timestamp_degraded": true to that object',
  );
  assert.notEqual(mutated, BASELINE_FILES[DOCS_REVIEWER], 'fixture precondition: the never-sets clause must exist verbatim in the baseline');

  const files = { ...BASELINE_FILES, [DOCS_REVIEWER]: mutated };
  const result = checkTimestampContract({ files, jsonlEntries: [], marker: null });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(
    result.findings[0].message,
    /Bash-capable reviewer's Timestamp discipline section instructs setting timestamp_degraded, but this reviewer has Bash and must self-serve the instant instead/,
  );
  assert.equal(result.findings[0].file, DOCS_REVIEWER);
});

// D2 — the negation trap: the SAME Bash-capable reviewer whose section says
// "never sets timestamp_degraded" (the baseline, unmutated) must PASS. A
// naive substring/occurrence test on the literal token `timestamp_degraded`
// cannot distinguish this from D1's SET instruction — both fixtures contain
// the token — so this test is what proves the distinction is real: the
// negated baseline produces strictly fewer (zero) degraded-flag findings
// than the SET-instruction variant above.
test('checkTimestampContract: D2 -- the negation trap discriminator: a reviewer whose section still says "never sets timestamp_degraded" passes, proving a naive substring check on the token would be vacuous', () => {
  const bashOk = BASELINE_FILES[DOCS_REVIEWER];
  const bashBad = bashOk.replace(
    'this agent has Bash and never sets `timestamp_degraded`',
    'this agent must add "timestamp_degraded": true to that object',
  );
  assert.notEqual(bashBad, bashOk, 'fixture precondition: the two variants must differ');

  const passResult = checkTimestampContract({ files: { ...BASELINE_FILES, [DOCS_REVIEWER]: bashOk }, jsonlEntries: [], marker: null });
  const failResult = checkTimestampContract({ files: { ...BASELINE_FILES, [DOCS_REVIEWER]: bashBad }, jsonlEntries: [], marker: null });

  assert.equal(passResult.ok, true);
  assert.deepEqual(passResult.findings, []);
  assert.ok(
    failResult.findings.length > passResult.findings.length,
    `the negation trap is not handled -- compliant fixture produced ${passResult.findings.length} findings, SET-instruction fixture produced ${failResult.findings.length}; the assertion would be vacuous under a naive substring implementation`,
  );
});

// D3 — a clockless reviewer instructed to use date -u it cannot run fails.
test('checkTimestampContract: D3 -- a clockless reviewer instructed to use date -u, which it has no Bash tool to run, fails', () => {
  const mutated = BASELINE_FILES[PLAN_REVIEWER].replace(
    'If the instant was not supplied, append the verdict anyway and add',
    'If the instant was not supplied, obtain it yourself with `date -u +%Y-%m-%dT%H:%M:%SZ`, append the verdict anyway, and add',
  );
  assert.notEqual(mutated, BASELINE_FILES[PLAN_REVIEWER], 'fixture precondition: the fallback clause must exist verbatim in the baseline');

  const files = { ...BASELINE_FILES, [PLAN_REVIEWER]: mutated };
  const result = checkTimestampContract({ files, jsonlEntries: [], marker: null });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(
    result.findings[0].message,
    /clockless reviewer's Timestamp discipline section instructs date -u, but this reviewer has no Bash tool to run it/,
  );
  assert.equal(result.findings[0].file, PLAN_REVIEWER);
});

// D4 — capability derivation, not hardcoding: a reviewer that is clockless
// in the real tree (design-map-reviewer.md) gets a `tools:` line that
// INCLUDES Bash, with nothing else about its fixture changed, and the
// expected branch flips: the clockless-style fallback (no date -u
// instruction) now fails where it previously passed. This is what proves
// the branch is derived from `tools:` at runtime rather than a hardcoded
// name list.
test('checkTimestampContract: D4 -- granting Bash to an otherwise-unchanged clockless reviewer\'s tools: line flips its expected branch from passing to failing', () => {
  const clockless = BASELINE_FILES[DESIGN_MAP_REVIEWER];
  const grantedBash = clockless.replace('tools: Read, Edit, Write', 'tools: Read, Edit, Write, Bash');
  assert.notEqual(grantedBash, clockless, 'fixture precondition: the tools: line must exist verbatim in the baseline');

  const before = checkTimestampContract({ files: { ...BASELINE_FILES, [DESIGN_MAP_REVIEWER]: clockless }, jsonlEntries: [], marker: null });
  const after = checkTimestampContract({ files: { ...BASELINE_FILES, [DESIGN_MAP_REVIEWER]: grantedBash }, jsonlEntries: [], marker: null });

  assert.equal(before.ok, true);
  assert.deepEqual(before.findings, []);

  assert.equal(after.ok, false);
  assert.ok(after.findings.length > 0, 'granting Bash via tools: must produce at least one finding for this reviewer');
  assert.ok(after.findings.every((f) => f.file === DESIGN_MAP_REVIEWER));
  assert.ok(after.findings.some((f) => /Bash-capable reviewer/.test(f.message)));
});

// ---------------------------------------------------------------------------
// Class E (AC-A3) — a dispatching command missing its date -u capture, and
// one missing the review_started_at pass-through.
// ---------------------------------------------------------------------------

test('checkTimestampContract: reports a dispatching command missing its date -u +%Y-%m-%dT%H:%M:%SZ capture', () => {
  const mutated = BASELINE_FILES[RELAY_PLAN_REVIEW_CMD].replace(
    'Capture the dispatch instant immediately before invoking the agent: `date -u +%Y-%m-%dT%H:%M:%SZ`.\n\n',
    '',
  );
  assert.notEqual(mutated, BASELINE_FILES[RELAY_PLAN_REVIEW_CMD], 'fixture precondition: the capture line must exist verbatim in the baseline');
  assert.ok(!mutated.includes('date -u +%Y-%m-%dT%H:%M:%SZ'));

  const files = { ...BASELINE_FILES, [RELAY_PLAN_REVIEW_CMD]: mutated };
  const result = checkTimestampContract({ files, jsonlEntries: [], marker: null });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /does not capture the instant with date -u \+%Y-%m-%dT%H:%M:%SZ/);
  assert.equal(result.findings[0].file, RELAY_PLAN_REVIEW_CMD);
});

test('checkTimestampContract: reports a dispatching command missing its review_started_at pass-through', () => {
  const mutated = BASELINE_FILES[RELAY_APPROVE_CMD].replace(
    ' with `review_started_at` set to the instant captured immediately above.',
    '.',
  );
  assert.notEqual(mutated, BASELINE_FILES[RELAY_APPROVE_CMD], 'fixture precondition: the pass-through clause must exist verbatim in the baseline');
  assert.ok(!mutated.includes('review_started_at'));

  const files = { ...BASELINE_FILES, [RELAY_APPROVE_CMD]: mutated };
  const result = checkTimestampContract({ files, jsonlEntries: [], marker: null });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /does not pass review_started_at through to the dispatched reviewer/);
  assert.equal(result.findings[0].file, RELAY_APPROVE_CMD);
});

// ---------------------------------------------------------------------------
// Class J (AC-A7, AC-A8, close-the-consumer-half... plan) — the CONSUMERS
// registry's executable-reference assertion (Assertion 6 in
// checkTimestampContract, which sits between the COMMANDS loop and the
// jsonl-output assertion in the source module). `files: { [EFFICIENCY_MJS]:
// ... }` isolates these tests to exactly this property, the same isolation
// pattern class F uses below for the jsonl assertion.
// ---------------------------------------------------------------------------

test('checkTimestampContract: J -- a registered consumer that references timestamp_degraded in executable code passes (baseline fixture)', () => {
  const result = checkTimestampContract({ files: { [EFFICIENCY_MJS]: EFFICIENCY_MJS_CONTENT }, jsonlEntries: [], marker: null });

  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

test('checkTimestampContract: J -- a registered consumer that mentions timestamp_degraded only inside a `//` line comment fails', () => {
  const mutated = EFFICIENCY_MJS_CONTENT.replace(
    'export function hasDegradedTimestamp(entry) {\n  return entry.timestamp_degraded === true;\n}\n',
    '// TODO: honor timestamp_degraded inside hasDegradedTimestamp below\nexport function hasDegradedTimestamp(entry) {\n  return false;\n}\n',
  );
  assert.notEqual(mutated, EFFICIENCY_MJS_CONTENT, 'fixture precondition: the executable reference line must exist verbatim in the baseline');
  assert.ok(
    !/timestamp_degraded/.test(mutated.replace(/\/\/.*$/gm, '')),
    'fixture precondition: after stripping // comments, no executable reference to timestamp_degraded should remain',
  );

  const result = checkTimestampContract({ files: { [EFFICIENCY_MJS]: mutated }, jsonlEntries: [], marker: null });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /registered consumer does not reference timestamp_degraded in executable code \(comment-only or absent\)/);
  assert.equal(result.findings[0].file, EFFICIENCY_MJS);
});

test('checkTimestampContract: J -- a registered consumer that mentions timestamp_degraded only inside a `/* *\\/` block comment fails', () => {
  const mutated = EFFICIENCY_MJS_CONTENT.replace(
    'export function hasDegradedTimestamp(entry) {\n  return entry.timestamp_degraded === true;\n}\n',
    '/* TODO: honor timestamp_degraded inside hasDegradedTimestamp below */\nexport function hasDegradedTimestamp(entry) {\n  return false;\n}\n',
  );
  assert.notEqual(mutated, EFFICIENCY_MJS_CONTENT, 'fixture precondition: the executable reference line must exist verbatim in the baseline');
  assert.ok(
    !/timestamp_degraded/.test(mutated.replace(/\/\*[\s\S]*?\*\//g, '')),
    'fixture precondition: after stripping /* */ comments, no executable reference to timestamp_degraded should remain',
  );

  const result = checkTimestampContract({ files: { [EFFICIENCY_MJS]: mutated }, jsonlEntries: [], marker: null });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /registered consumer does not reference timestamp_degraded in executable code \(comment-only or absent\)/);
  assert.equal(result.findings[0].file, EFFICIENCY_MJS);
});

// ---------------------------------------------------------------------------
// Class F (AC-A6) — the real-output jsonl assertion. `files: {}` isolates
// these tests to exactly this property: every reviewer/command entry is
// falsy and therefore silently skipped by the prose-assertion loops (see the
// class G robustness test below), leaving only the marker/jsonl behavior
// under test.
// ---------------------------------------------------------------------------

const MARKER = '2026-07-31T18:02:16Z';

test('checkTimestampContract: F -- a post-marker jsonl entry stamped T00:00:00 without timestamp_degraded fails', () => {
  const entry = { file: 'PRPs/plans/example.jsonl', line: 7, timestamp: '2026-08-01T00:00:00Z', verdict: 'APPROVED' };
  const result = checkTimestampContract({ files: {}, jsonlEntries: [entry], marker: MARKER });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(
    result.findings[0].message,
    /post-marker jsonl verdict entry carries a T00:00:00 timestamp without an accompanying timestamp_degraded flag/,
  );
  assert.equal(result.findings[0].file, entry.file);
  assert.equal(result.findings[0].line, entry.line);
});

test('checkTimestampContract: F -- the same post-marker T00:00:00 entry WITH timestamp_degraded passes', () => {
  const entry = {
    file: 'PRPs/plans/example.jsonl',
    line: 7,
    timestamp: '2026-08-01T00:00:00Z',
    verdict: 'APPROVED',
    timestamp_degraded: true,
  };
  const result = checkTimestampContract({ files: {}, jsonlEntries: [entry], marker: MARKER });

  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

test('checkTimestampContract: F -- a PRE-marker entry stamped T00:00:00 passes (historic entries are exempt by design)', () => {
  const entry = { file: 'PRPs/plans/example.jsonl', line: 3, timestamp: '2026-07-30T00:00:00Z', verdict: 'APPROVED' };
  const result = checkTimestampContract({ files: {}, jsonlEntries: [entry], marker: MARKER });

  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

test('checkTimestampContract: F -- an absent marker skips the output assertion with a visible note, neither failing nor silently passing over a genuine violation', () => {
  const wouldViolateEntry = { file: 'PRPs/plans/example.jsonl', line: 9, timestamp: '2026-08-01T00:00:00Z', verdict: 'APPROVED' };
  const result = checkTimestampContract({ files: {}, jsonlEntries: [wouldViolateEntry], marker: null });

  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
  assert.ok(result.notes.some((n) => n.includes('absent or unparseable') && n.includes('AC-A6 output assertion skipped')));
});

test('checkTimestampContract: F -- an unparseable marker skips the output assertion with a visible note', () => {
  const wouldViolateEntry = { file: 'PRPs/plans/example.jsonl', line: 9, timestamp: '2026-08-01T00:00:00Z', verdict: 'APPROVED' };
  const result = checkTimestampContract({ files: {}, jsonlEntries: [wouldViolateEntry], marker: 'not-a-real-date' });

  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
  assert.ok(result.notes.some((n) => n.includes('could not be parsed as a date') && n.includes('AC-A6 output assertion skipped')));
});

// ---------------------------------------------------------------------------
// Class G — robustness: null/unreadable/missing file entries and malformed
// jsonl/marker inputs never throw. One looped test over the input shapes
// rather than several near-duplicates (a prior review rejected duplicated
// robustness tests in the sibling suite). Falsy file content is silently
// skipped by the pure function's per-path loops by design — the module's
// own comment marks it "already reported by the wrapper". That wrapper-level
// reporting is a DIFFERENT code path (runTimestampContractCheck's own
// existsSync/readFileSync try-catch) and is NOT exercised by the real-tree
// real-wrapper test below, since every watched file genuinely exists and
// reads cleanly there. It is exercised instead by the two dedicated
// temp-directory tests immediately following this one.
// ---------------------------------------------------------------------------

test('checkTimestampContract: never throws across malformed/missing input shapes for files, jsonlEntries, and marker', () => {
  const filePaths = Object.keys(BASELINE_FILES);
  const scenarios = [
    { files: {}, jsonlEntries: [], marker: null },
    { files: Object.fromEntries(filePaths.map((p) => [p, null])), jsonlEntries: [], marker: null },
    { files: Object.fromEntries(filePaths.map((p) => [p, ''])), jsonlEntries: [], marker: null },
    { files: {}, jsonlEntries: null, marker: null },
    { files: {}, jsonlEntries: [null, undefined, {}, { timestamp: 42 }, { timestamp: 'not-a-date' }], marker: MARKER },
    { files: {}, jsonlEntries: [], marker: {} },
  ];

  for (const scenario of scenarios) {
    let result;
    assert.doesNotThrow(() => {
      result = checkTimestampContract(scenario);
    });
    assert.equal(typeof result.ok, 'boolean');
    assert.ok(Array.isArray(result.findings));
    assert.ok(Array.isArray(result.notes));
  }

  const allNullResult = checkTimestampContract({
    files: Object.fromEntries(filePaths.map((p) => [p, null])),
    jsonlEntries: [],
    marker: null,
  });
  assert.deepEqual(allNullResult.findings, []);
});

// ---------------------------------------------------------------------------
// Class G (continued, AC-A1) — the WRAPPER's own fs-level error handling:
// missing and unreadable watched files must become loud findings, never a
// throw. This is runTimestampContractCheck's existsSync/readFileSync
// try-catch (scripts/validate/checks/timestamp-contract.mjs), a different
// code path from the pure-function robustness test above. `resolve(path)`
// is cwd-relative, so a temp directory + process.chdir() exercises it
// without mutating the real repository tree. The original cwd is restored
// in `finally` in both tests so the real-wrapper and registration tests
// that run after these are unaffected by a leaked chdir.
// ---------------------------------------------------------------------------

test('runTimestampContractCheck: a missing watched file produces a loud "missing file: <path>" finding, never a throw', () => {
  const originalCwd = process.cwd();
  const tempDir = mkdtempSync(join(tmpdir(), 'timestamp-contract-test-'));

  try {
    process.chdir(tempDir);

    let result;
    assert.doesNotThrow(() => {
      result = runTimestampContractCheck();
    });

    assert.equal(result.ok, false);
    assert.equal(result.findings.length, WATCHED_FILES.length);
    assert.ok(result.findings.every((f) => /^missing file: /.test(f.message)));
    assert.ok(result.findings.some((f) => f.message === `missing file: ${CODE_REVIEWER}` && f.file === CODE_REVIEWER));
  } finally {
    process.chdir(originalCwd);
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('runTimestampContractCheck: an unreadable watched file (a directory sitting at that path) produces a loud "could not read <path>:" finding, never a throw', () => {
  const originalCwd = process.cwd();
  const tempDir = mkdtempSync(join(tmpdir(), 'timestamp-contract-test-'));

  try {
    process.chdir(tempDir);
    // A directory at the watched path: existsSync is true, but readFileSync
    // throws (EISDIR on POSIX; an equivalent illegal-operation error on
    // Windows) -- this is what drives the wrapper's catch branch, cross-platform.
    mkdirSync(resolve(CODE_REVIEWER), { recursive: true });

    let result;
    assert.doesNotThrow(() => {
      result = runTimestampContractCheck();
    });

    assert.equal(result.ok, false);
    assert.equal(result.findings.length, WATCHED_FILES.length);
    const unreadable = result.findings.filter((f) => f.file === CODE_REVIEWER);
    assert.equal(unreadable.length, 1);
    assert.ok(unreadable[0].message.startsWith(`could not read ${CODE_REVIEWER}: `));
    const others = result.findings.filter((f) => f.file !== CODE_REVIEWER);
    assert.equal(others.length, WATCHED_FILES.length - 1);
    assert.ok(others.every((f) => /^missing file: /.test(f.message)));
  } finally {
    process.chdir(originalCwd);
    rmSync(tempDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Class H (AC-A1) — real-wrapper test: runTimestampContractCheck() against
// the actual, already-implemented, contract-compliant repository tree.
// ---------------------------------------------------------------------------

test('runTimestampContractCheck: ok:true with zero findings against the real, already-implemented repository tree', () => {
  const result = runTimestampContractCheck();

  assert.equal(result.name, 'timestamp-contract');
  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

// ---------------------------------------------------------------------------
// Class I (AC-A5) — registration: scripts/validate/index.mjs imports
// runTimestampContractCheck and lists it in the CHECKS array.
// ---------------------------------------------------------------------------

test('scripts/validate/index.mjs imports runTimestampContractCheck and registers it in the CHECKS array', () => {
  const content = readFileSync(resolve(INDEX_PATH), 'utf-8');

  assert.match(content, /import\s*\{\s*runTimestampContractCheck\s*\}\s*from\s*'\.\/checks\/timestamp-contract\.mjs'/);

  const checksBlock = content.slice(content.indexOf('const CHECKS'), content.indexOf('];', content.indexOf('const CHECKS')) + 2);
  assert.match(checksBlock, /runTimestampContractCheck/);
});
