// @ts-check
/**
 * Unit + CLI coverage for scripts/normalize-test-output.mjs, focused on the
 * node:test framework support added on 2026-07-15 (two coupled defects: the
 * VALID_FRAMEWORKS allow-list rejected `node:test`, and parseSuites only
 * understood the <testsuite>-wrapped JUnit shape, so Node's built-in
 * `--test-reporter=junit` output normalized to an all-zero
 * SKIPPED_UPSTREAM_FAILURE record). Also pins the pre-existing
 * pytest/Vitest/Playwright behavior as a no-regression guard.
 *
 * node:test emits TWO shapes and this suite covers both:
 *   - "bare"    : a <testsuites> root with <testcase> elements nested directly
 *                 beneath it — no <testsuite> wrapper, no summary attributes.
 *   - "wrapped" : one <testsuite> per describe()/suite() block, arbitrarily
 *                 NESTED, whose tests/failures counts DON'T sum cleanly across
 *                 the nesting (outer tests="3" + inner tests="2" for a 4-test
 *                 run). The normalizer counts <testcase> elements instead.
 *
 * The fixtures below are trimmed but faithful captures of real
 * `node --test --test-reporter=junit` output (Node 18+), including the
 * `failure="..."` attribute Node puts on the <testcase> open tag and its
 * &#10;-encoded newlines in the <failure message="..."> attribute.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented, code-reviewed
 * normalizer. Pure-function assertions import the exported helpers directly; the
 * CLI assertions spawn the real script so the arg-parse + exit-code contract in
 * the acceptance criteria is exercised end-to-end.
 *
 * Relocated 2026-07-29 from scripts/normalize-test-output.test.mjs to
 * plugins/relay/scripts/normalize-test-output.test.mjs, alongside its
 * subject module's own move into the plugin tree (so
 * `${CLAUDE_PLUGIN_ROOT}/scripts/normalize-test-output.mjs` resolves in a
 * real packaged install) — this file's relative import of its subject
 * (`./normalize-test-output.mjs`) would otherwise dangle. Content is
 * otherwise byte-identical to the pre-move file; only this comment and the
 * `Run:` line below changed.
 *
 * Run: node --test plugins/relay/scripts/normalize-test-output.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  parseSuites,
  countTestcases,
  buildCounts,
  sumDurationMs,
  determineOutcome,
  collectFailures,
} from './normalize-test-output.mjs';

const NORMALIZER = fileURLToPath(new URL('./normalize-test-output.mjs', import.meta.url));

// ---------------------------------------------------------------------------
// Fixtures — faithful (trimmed) captures of real node:test junit output.
// ---------------------------------------------------------------------------

// Bare shape: flat test() calls → <testcase> directly under <testsuites>.
// 2 passed, 1 failed, 1 skipped.
const BARE_NODE_JUNIT = `<?xml version="1.0" encoding="utf-8"?>
<testsuites>
	<testcase name="passes a" time="0.000746" classname="test" file="/proj/sample.test.mjs"/>
	<testcase name="passes b" time="0.000135" classname="test" file="/proj/sample.test.mjs"/>
	<testcase name="fails c" time="0.000769" classname="test" file="/proj/sample.test.mjs" failure="Expected values to be strictly equal:&#10;&#10;1 !== 2&#10;">
		<failure type="testCodeFailure" message="Expected values to be strictly equal:&#10;&#10;1 !== 2">
Error [ERR_TEST_FAILURE]: Expected values to be strictly equal:

1 !== 2
		</failure>
	</testcase>
	<testcase name="skipped d" time="0.000104" classname="test" file="/proj/sample.test.mjs">
		<skipped type="skipped" message="true"/>
	</testcase>
	<!-- tests 4 -->
	<!-- pass 2 -->
	<!-- fail 1 -->
	<!-- skipped 1 -->
	<!-- duration_ms 100.5768 -->
</testsuites>
`;

// Wrapped shape: describe() blocks → NESTED <testsuite> elements. The outer
// suite's tests="3" already subsumes the inner suite's tests="2"; naive
// attribute summing would report total=5 for what is really a 4-test run.
// 2 passed, 1 failed, 1 skipped.
const WRAPPED_NODE_JUNIT = `<?xml version="1.0" encoding="utf-8"?>
<testsuites>
	<testsuite name="outer group" time="0.003589" disabled="0" errors="0" tests="3" failures="1" skipped="1" hostname="host">
		<testcase name="passes a" time="0.000662" classname="test" file="/proj/nested.test.mjs"/>
		<testcase name="fails b" time="0.000787" classname="test" file="/proj/nested.test.mjs" failure="Expected values to be strictly equal:&#10;&#10;1 !== 2&#10;">
			<failure type="testCodeFailure" message="Expected values to be strictly equal:&#10;&#10;1 !== 2">
Error [ERR_TEST_FAILURE]: boom
			</failure>
		</testcase>
		<testsuite name="inner group" time="0.001185" disabled="0" errors="0" tests="2" failures="0" skipped="1" hostname="host">
			<testcase name="skipped c" time="0.000138" classname="test" file="/proj/nested.test.mjs">
				<skipped type="skipped" message="true"/>
			</testcase>
			<testcase name="passes d" time="0.000214" classname="test" file="/proj/nested.test.mjs"/>
		</testsuite>
	</testsuite>
	<!-- tests 4 -->
	<!-- suites 2 -->
	<!-- pass 2 -->
	<!-- fail 1 -->
	<!-- skipped 1 -->
	<!-- duration_ms 103.2929 -->
</testsuites>
`;

// Bare shape where test names / failure messages contain a RAW `>`. node:test's
// junit reporter escapes `<` as `&lt;` but emits `>` literally inside
// name="..." / failure="..." / message="...". A naive `[^>]*?` attribute matcher
// ends the tag at that raw `>`, so the `>`-named self-closing cases look
// unterminated and the lazy body branch swallows the following siblings until
// the next real </testcase>. This fixture is the reduced repro of the
// full-suite 92-vs-104 undercount: 3 passing self-closing siblings (two with a
// raw `>` in the name) around one failing case whose name AND message both
// carry raw `>`. Correct parse: passed 3 / failed 1 / total 4, siblings intact.
const RAW_GT_NODE_JUNIT = `<?xml version="1.0" encoding="utf-8"?>
<testsuites>
	<testcase name="collapses the &lt;testsuites> body into one suite" time="0.001" classname="test" file="/proj/gt.test.mjs"/>
	<testcase name="plain sibling after the raw-&gt; case" time="0.001" classname="test" file="/proj/gt.test.mjs"/>
	<testcase name="reports expected > received" time="0.002" classname="test" file="/proj/gt.test.mjs" failure="want a &lt;b> got a >= b">
		<failure type="testCodeFailure" message="want a &lt;b> got a >= b">
Error [ERR_TEST_FAILURE]: want a <b> got a >= b
		</failure>
	</testcase>
	<testcase name="final self-closing sibling" time="0.001" classname="test" file="/proj/gt.test.mjs"/>
</testsuites>
`;

// pytest single-<testsuite> shape with summary attributes. Deliberately lists
// FEWER <testcase> elements (2) than tests="5" claims, so a test that asserts
// total==5 proves the non-node path still trusts the suite attributes rather
// than counting testcases.
const PYTEST_JUNIT = `<?xml version="1.0" encoding="utf-8"?>
<testsuite name="pytest" errors="1" failures="1" skipped="1" tests="5" time="1.234">
  <testcase classname="tests.test_a" name="test_ok" file="tests/test_a.py" line="3" time="0.01"/>
  <testcase classname="tests.test_b" name="test_bad" file="tests/test_b.py" line="12" time="0.02">
    <failure message="assert 1 == 2">tb</failure>
  </testcase>
</testsuite>
`;

// Vitest/Playwright <testsuites> root with FLAT sibling <testsuite> children.
const VITEST_JUNIT = `<?xml version="1.0" encoding="utf-8"?>
<testsuites name="vitest" tests="3" failures="1">
  <testsuite name="a.test.ts" tests="2" failures="0" skipped="0" time="0.5">
    <testcase classname="a" name="one" time="0.1"/>
    <testcase classname="a" name="two" time="0.1"/>
  </testsuite>
  <testsuite name="b.test.ts" tests="1" failures="1" skipped="0" time="0.3">
    <testcase classname="b" name="three" time="0.1"><failure message="boom">stack</failure></testcase>
  </testsuite>
</testsuites>
`;

// ---------------------------------------------------------------------------
// parseSuites — framework-driven shape handling.
// ---------------------------------------------------------------------------

test('parseSuites(node:test, bare): collapses the <testsuites> body into one synthesized suite', () => {
  const suites = parseSuites(BARE_NODE_JUNIT, 'node:test');
  assert.equal(suites.length, 1);
  assert.equal(suites[0].synthesized, true);
  assert.match(suites[0].body, /<testcase\b/);
});

test('parseSuites(node:test, wrapped/nested): still one synthesized suite, not one-per-<testsuite>', () => {
  const suites = parseSuites(WRAPPED_NODE_JUNIT, 'node:test');
  assert.equal(suites.length, 1);
  assert.equal(suites[0].synthesized, true);
  // The synthesized body retains the nested <testsuite> wrappers, but all four
  // <testcase> elements live inside it.
  assert.equal((suites[0].body.match(/<testcase\b/g) || []).length, 4);
});

test('parseSuites(node:test): returns [] when there is no <testcase>, so the caller malformed-input guard fires', () => {
  assert.deepEqual(parseSuites('<?xml version="1.0"?><testsuites></testsuites>', 'node:test'), []);
  assert.deepEqual(parseSuites('total garbage, not xml', 'node:test'), []);
});

test('parseSuites(non-node): unchanged <testsuite> extraction — one entry per sibling suite, never synthesized', () => {
  const pytest = parseSuites(PYTEST_JUNIT, 'pytest');
  assert.equal(pytest.length, 1);
  assert.equal(pytest[0].synthesized, undefined);
  assert.equal(pytest[0].attrs.tests, '5');

  const vitest = parseSuites(VITEST_JUNIT, 'vitest');
  assert.equal(vitest.length, 2);
  assert.ok(vitest.every((s) => s.synthesized === undefined));
});

// ---------------------------------------------------------------------------
// countTestcases — pass/fail/skip/total from <testcase> elements.
// ---------------------------------------------------------------------------

test('countTestcases: classifies self-closing=passed, nested <failure>=failed, nested <skipped>=skipped', () => {
  const body = parseSuites(BARE_NODE_JUNIT, 'node:test')[0].body;
  assert.deepEqual(countTestcases(body), { passed: 2, failed: 1, skipped: 1, total: 4 });
});

test('countTestcases: walks <testcase> across intervening nested <testsuite> tags (wrapped shape)', () => {
  const body = parseSuites(WRAPPED_NODE_JUNIT, 'node:test')[0].body;
  assert.deepEqual(countTestcases(body), { passed: 2, failed: 1, skipped: 1, total: 4 });
});

test('countTestcases: <error> counts as failed just like <failure>', () => {
  const body = '<testcase name="e"><error message="boom">x</error></testcase><testcase name="ok"/>';
  assert.deepEqual(countTestcases(body), { passed: 1, failed: 1, skipped: 0, total: 2 });
});

// ---------------------------------------------------------------------------
// buildCounts — synthesized suites count testcases; real suites sum attributes.
// This is the core of the bare + wrapped fix and the pytest no-regression pin.
// ---------------------------------------------------------------------------

test('buildCounts(node:test bare): 2 passed / 1 failed / 1 skipped / 4 total (was all-zero before the fix)', () => {
  const counts = buildCounts(parseSuites(BARE_NODE_JUNIT, 'node:test'));
  assert.deepEqual(counts, { passed: 2, failed: 1, skipped: 1, total: 4 });
});

test('buildCounts(node:test wrapped): total is 4, NOT the 5 that naive nested-attribute summing would produce', () => {
  const counts = buildCounts(parseSuites(WRAPPED_NODE_JUNIT, 'node:test'));
  assert.deepEqual(counts, { passed: 2, failed: 1, skipped: 1, total: 4 });
});

test('buildCounts(pytest): trusts suite summary attributes (failures+errors→failed), not the listed testcase count', () => {
  // tests="5" failures="1" errors="1" skipped="1" → passed = 5-1-1-1 = 2,
  // even though only two <testcase> elements are present in the fixture.
  const counts = buildCounts(parseSuites(PYTEST_JUNIT, 'pytest'));
  assert.deepEqual(counts, { passed: 2, failed: 2, skipped: 1, total: 5 });
});

test('buildCounts(vitest): sums flat sibling <testsuite> attributes', () => {
  const counts = buildCounts(parseSuites(VITEST_JUNIT, 'vitest'));
  assert.deepEqual(counts, { passed: 2, failed: 1, skipped: 0, total: 3 });
});

// ---------------------------------------------------------------------------
// sumDurationMs — synthesized suites sum per-testcase time; real suites use the
// suite-level time attribute.
// ---------------------------------------------------------------------------

test('sumDurationMs(node:test): sums per-<testcase> time (no suite-level time attribute exists)', () => {
  // (0.000746 + 0.000135 + 0.000769 + 0.000104) * 1000 ≈ 1.754 → 2 ms
  assert.equal(sumDurationMs(parseSuites(BARE_NODE_JUNIT, 'node:test')), 2);
});

test('sumDurationMs(pytest): uses the suite-level time attribute (1.234s → 1234ms)', () => {
  assert.equal(sumDurationMs(parseSuites(PYTEST_JUNIT, 'pytest')), 1234);
});

// ---------------------------------------------------------------------------
// determineOutcome.
// ---------------------------------------------------------------------------

test('determineOutcome: FAILED when any failed, PASSED when clean, SKIPPED_UPSTREAM_FAILURE when empty', () => {
  assert.equal(determineOutcome({ passed: 2, failed: 1, skipped: 1, total: 4 }), 'FAILED');
  assert.equal(determineOutcome({ passed: 4, failed: 0, skipped: 0, total: 4 }), 'PASSED');
  assert.equal(determineOutcome({ passed: 0, failed: 0, skipped: 0, total: 0 }), 'SKIPPED_UPSTREAM_FAILURE');
});

// ---------------------------------------------------------------------------
// collectFailures — one entry per failed node:test testcase, with the &#10;
// numeric character references in the message decoded to real newlines.
// ---------------------------------------------------------------------------

test('collectFailures(node:test bare): one failure with decoded message, file, null line, and classname#name ref', () => {
  const failures = collectFailures(parseSuites(BARE_NODE_JUNIT, 'node:test'));
  assert.equal(failures.length, 1);
  const f = failures[0];
  assert.equal(f.test, 'fails c');
  assert.equal(f.file, '/proj/sample.test.mjs');
  assert.equal(f.line, null); // node:test testcases carry no line attribute
  assert.equal(f.raw_framework_output_ref, 'test#fails c');
  assert.equal(f.category, null);
  // The &#10; numeric char refs in the message attribute are decoded to real
  // newlines — the raw entity text must NOT leak into the record.
  assert.equal(f.message, 'Expected values to be strictly equal:\n\n1 !== 2');
  assert.doesNotMatch(f.message, /&#10;/);
});

test('collectFailures(node:test wrapped): finds the failing testcase nested inside a describe suite', () => {
  const failures = collectFailures(parseSuites(WRAPPED_NODE_JUNIT, 'node:test'));
  assert.equal(failures.length, 1);
  assert.equal(failures[0].test, 'fails b');
});

// ---------------------------------------------------------------------------
// Raw `>` inside quoted attribute values (node:test escapes `<` but not `>`).
// Regression guard for the 92-vs-104 undercount: the tag-boundary regexes must
// treat a `>` inside "..." as data, so a `>`-named self-closing testcase does
// not swallow the following siblings, and a failure message keeps its raw `>`.
// ---------------------------------------------------------------------------

test('countTestcases: a raw `>` in a testcase name does not swallow the following siblings', () => {
  const body = parseSuites(RAW_GT_NODE_JUNIT, 'node:test')[0].body;
  // Before the fix this returned total 2 (tc1 swallowed tc2 + tc3's open tag).
  assert.deepEqual(countTestcases(body), { passed: 3, failed: 1, skipped: 0, total: 4 });
});

test('buildCounts(node:test): every testcase counted even when names carry a raw `>`', () => {
  const counts = buildCounts(parseSuites(RAW_GT_NODE_JUNIT, 'node:test'));
  assert.deepEqual(counts, { passed: 3, failed: 1, skipped: 0, total: 4 });
});

test('collectFailures(node:test): a failure message containing a raw `>` is preserved, attributed to the right case', () => {
  const failures = collectFailures(parseSuites(RAW_GT_NODE_JUNIT, 'node:test'));
  assert.equal(failures.length, 1);
  const f = failures[0];
  // Attribution lands on the actually-failing case, not a swallowed neighbor.
  assert.equal(f.test, 'reports expected > received');
  assert.equal(f.file, '/proj/gt.test.mjs');
  // The raw `>` (and the decoded `&lt;`) both survive in the message.
  assert.equal(f.message, 'want a <b> got a >= b');
});

// ---------------------------------------------------------------------------
// CLI contract — the exact acceptance-criteria invocation, end-to-end.
// ---------------------------------------------------------------------------

/** Run the normalizer as a child process; capture status + stdout even on a
 *  non-zero exit (execFileSync throws, carrying status/stdout/stderr). */
function runCli(args) {
  try {
    const stdout = execFileSync(process.execPath, [NORMALIZER, ...args], { encoding: 'utf-8' });
    return { status: 0, stdout, stderr: '' };
  } catch (err) {
    return { status: err.status ?? 1, stdout: err.stdout ?? '', stderr: err.stderr ?? '' };
  }
}

/** Write `xml` to a throwaway temp file, invoke `fn(path)`, always clean up. */
function withFixture(xml, fn) {
  const dir = mkdtempSync(join(tmpdir(), 'relay-norm-'));
  const path = join(dir, 'junit.xml');
  writeFileSync(path, xml, 'utf-8');
  try {
    return fn(path);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('CLI: --framework node:test --junit <bare> --tier unit --attempt 1 → exit 0 + correct record.json', () => {
  withFixture(BARE_NODE_JUNIT, (path) => {
    const { status, stdout } = runCli(['--framework', 'node:test', '--junit', path, '--tier', 'unit', '--attempt', '1']);
    assert.equal(status, 0);
    const record = JSON.parse(stdout);
    assert.equal(record.framework, 'node:test');
    assert.equal(record.tier, 'unit');
    assert.equal(record.attempt, 1);
    assert.equal(record.outcome, 'FAILED');
    assert.deepEqual(record.counts, { passed: 2, failed: 1, skipped: 1, total: 4 });
    assert.equal(record.failures.length, 1);
    assert.equal(record.artifacts.junit_xml, path);
  });
});

test('CLI: node:test wrapped/nested describe report → exit 0 + total 4 (not 5)', () => {
  withFixture(WRAPPED_NODE_JUNIT, (path) => {
    const { status, stdout } = runCli(['--framework', 'node:test', '--junit', path, '--tier', 'unit', '--attempt', '1']);
    assert.equal(status, 0);
    const record = JSON.parse(stdout);
    assert.equal(record.outcome, 'FAILED');
    assert.deepEqual(record.counts, { passed: 2, failed: 1, skipped: 1, total: 4 });
  });
});

test('CLI: node:test with an all-green report → PASSED', () => {
  const green = `<?xml version="1.0" encoding="utf-8"?>
<testsuites>
	<testcase name="a" time="0.001" classname="test" file="/proj/x.test.mjs"/>
	<testcase name="b" time="0.001" classname="test" file="/proj/x.test.mjs"/>
</testsuites>
`;
  withFixture(green, (path) => {
    const { status, stdout } = runCli(['--framework', 'node:test', '--junit', path, '--tier', 'unit', '--attempt', '1']);
    assert.equal(status, 0);
    const record = JSON.parse(stdout);
    assert.equal(record.outcome, 'PASSED');
    assert.deepEqual(record.counts, { passed: 2, failed: 0, skipped: 0, total: 2 });
  });
});

test('CLI: node:test report with raw `>` in names/messages → total 4, message intact', () => {
  withFixture(RAW_GT_NODE_JUNIT, (path) => {
    const { status, stdout } = runCli(['--framework', 'node:test', '--junit', path, '--tier', 'unit', '--attempt', '1']);
    assert.equal(status, 0);
    const record = JSON.parse(stdout);
    assert.equal(record.outcome, 'FAILED');
    assert.deepEqual(record.counts, { passed: 3, failed: 1, skipped: 0, total: 4 });
    assert.equal(record.failures.length, 1);
    assert.equal(record.failures[0].message, 'want a <b> got a >= b');
  });
});

test('CLI: --framework node:test is accepted (no longer exits 2 on the allow-list check)', () => {
  withFixture(BARE_NODE_JUNIT, (path) => {
    const { status } = runCli(['--framework', 'node:test', '--junit', path]);
    assert.equal(status, 0);
  });
});

test('CLI: a bogus --framework still exits 2 and names node:test in the allow-list error', () => {
  withFixture(BARE_NODE_JUNIT, (path) => {
    const { status, stderr } = runCli(['--framework', 'bogus', '--junit', path]);
    assert.equal(status, 2);
    assert.match(stderr, /node:test/);
  });
});

test('CLI: node:test on a file with no testcases exits 2 (malformed), not a silent zero-count record', () => {
  withFixture('this is not JUnit XML at all', (path) => {
    const { status } = runCli(['--framework', 'node:test', '--junit', path]);
    assert.equal(status, 2);
  });
});
