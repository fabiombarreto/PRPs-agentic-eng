// @ts-check
/**
 * Content-invariant tests for Phase 2 ("Prevention") of the
 * test-formatting-prevention-preflight feature —
 * plugins/relay/commands/relay-write-test.md (the new
 * `## Phase A.4 — Command-layer formatting (Prevention)` command-layer
 * step) and plugins/relay/agents/test-reviewer.md (the new informational
 * Phase 0 awareness bullet for the `## Formatting Outcome` manifest
 * section it may read).
 *
 * Same idiom as test-formatting-prevention-preflight-phase1.test.mjs /
 * docs-sync-phase1.test.mjs / usage-metrics-phase1.test.mjs: this phase's
 * deliverable is prompt/protocol markdown, not a new production .mjs
 * export — there is no runtime code to unit-test directly (the formatter
 * invocation is a `Bash` call issued autonomously by the command
 * *protocol*, not by a script this corpus can import and execute). The
 * meaningful, non-trivial, discriminative assertion is: does the shipped
 * prose actually state the normative content AC-A1..AC-A6 require, in the
 * exact ordering/discovery-chain/never-silent-omission/non-halting shape
 * the plan committed to — not merely that some text containing the word
 * "formatter" exists somewhere in the file.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed, IMPLEMENTED Phase 2 plan
 * (PRPs/plans/completed/test-formatting-prevention-preflight-phase-2-prevention.plan.md).
 *
 * Traceability (PRPs/prds/test-formatting-prevention-preflight.prd.md
 * Acceptance Criteria, narrowed by the plan's own AC-A1..AC-A6; AC-3/4/5/6/7/8
 * are OUT_OF_PHASE_SCOPE, deferred to Phases 3-5 — see
 * PRPs/reports/test-formatting-prevention-preflight/test-suite.diff):
 *   AC-A1 (PRD AC-1, "Prevention runs") — Phase A.4 sits strictly after
 *     Phase A adoption and before "There is no Phase B" (i.e. before any
 *     later, separate /relay-test-write-review dispatch of test-reviewer);
 *     A.4.1's touched-file collection is UNION(new files, UPDATE ledger
 *     rows) EXCLUDING DELETE rows and EXISTING_TEST_COVERS mappings;
 *     A.4.2's three-branch discovery chain runs in strict (a)->(b)->(c)
 *     order and is never heuristic.
 *   AC-A2 (PRD AC-2, "Omission never silent") — branch (c) always records
 *     the omission explicitly (discovery chain attempted + result), and
 *     the rendered outcome block's "omitted" shape is a named, distinct
 *     bullet — never silently skipped with no trace.
 *   AC-A3 (PRD AC-1) — the formatter invocation is built strictly from the
 *     literal A.4.1 touched-file list, never a glob, never the whole repo;
 *     a durable Constraints bullet makes this rule survive independent of
 *     A.4.3's own wording.
 *   AC-A4 (PRD AC-1; Decisions Log "Prevention ownership" row) —
 *     test-writer.md's `tools:` frontmatter line stays byte-identical
 *     (`Task, Read, Write, Edit, Glob`, no Bash), reinforced by a durable
 *     "What you do NOT do" bullet in relay-write-test.md.
 *   AC-A5 (PRD AC-1) — A.4.4 always appends a `## Formatting Outcome`
 *     section anchored on test-writer's own literal `## Status` /
 *     `*Status: DRAFT*` block; the rendered outcome enumerates all four
 *     shapes (formatted / failed / nothing-to-format / omitted); the Final
 *     output surface's command-owned summary line enumerates the same four
 *     shapes; test-reviewer.md's Phase 0 documents reading the section as
 *     informational only, explicitly NOT a rubric input, and the seven-id
 *     rubric taxonomy gains no eighth "formatting" id.
 *   AC-A6 (PRD AC-1) — a non-zero formatter exit is recorded as "formatter
 *     invocation failed" but does NOT halt the command; an Edit-anchor
 *     mismatch is a soft-fail (warning, not a HALT) that leaves
 *     `*Status: DRAFT*` intact and the Writer's suite still surfaced.
 *
 * Run: node --test scripts/validate/checks/test-formatting-prevention-preflight-phase2.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const COMMAND_PATH = 'plugins/relay/commands/relay-write-test.md';
const REVIEWER_PATH = 'plugins/relay/agents/test-reviewer.md';
const WRITER_PATH = 'plugins/relay/agents/test-writer.md';

/**
 * Reads a repo-root-relative file and normalizes line endings to `\n`, so
 * `^...$`/`/m` assertions behave identically regardless of the checkout's
 * line-ending configuration. Mirrors
 * test-formatting-prevention-preflight-phase1.test.mjs's readRepoFile.
 * @param {string} relPath
 * @returns {string}
 */
function readRepoFile(relPath) {
  return readFileSync(resolve(relPath), 'utf-8').replace(/\r\n/g, '\n');
}

/**
 * Extracts a `## <heading>` section's body, up to the next `## ` heading at
 * column 0 (or end of file). `### `-level sub-headings are NOT boundaries,
 * so this returns an entire top-level section including its sub-steps.
 * Mirrors test-formatting-prevention-preflight-phase1.test.mjs's
 * sectionBody helper.
 * @param {string} content
 * @param {string} heading
 * @returns {string}
 */
function sectionBody(content, heading) {
  const marker = `## ${heading}\n`;
  const start = content.indexOf(marker);
  assert.notEqual(start, -1, `expected a "## ${heading}" section`);
  const rest = content.slice(start + 1);
  const next = rest.indexOf('\n## ');
  return next === -1 ? rest : rest.slice(0, next);
}

// ---------------------------------------------------------------------------
// AC-A1 (PRD AC-1) — Phase A.4 sits strictly between Phase A adoption and
// "There is no Phase B" (i.e. before any later, separate
// /relay-test-write-review dispatch of test-reviewer), and only runs on a
// non-halting Writer verdict.
// ---------------------------------------------------------------------------

test('AC-A1: Phase A.4 (Command-layer formatting) is positioned after Phase A adoption and before "There is no Phase B" — strictly before any later test-reviewer dispatch', () => {
  const content = readRepoFile(COMMAND_PATH);

  const phaseAIdx = content.indexOf('## Phase A — Adopt the Writer role');
  const phaseA4Idx = content.indexOf('## Phase A.4 — Command-layer formatting (Prevention)');
  const noPhaseBIdx = content.indexOf('**There is no Phase B.**');

  assert.notEqual(phaseAIdx, -1, 'expected a "## Phase A — Adopt the Writer role" section');
  assert.notEqual(phaseA4Idx, -1, 'expected a "## Phase A.4 — Command-layer formatting (Prevention)" section');
  assert.notEqual(noPhaseBIdx, -1, 'expected the "**There is no Phase B.**" sentence');

  assert.ok(phaseAIdx < phaseA4Idx, 'Phase A.4 must come after Phase A adoption');
  assert.ok(
    phaseA4Idx < noPhaseBIdx,
    'Phase A.4 must come before "There is no Phase B" — this is what makes prevention run before any later, separate /relay-test-write-review invocation could dispatch test-reviewer'
  );
});

test('AC-A1: Phase A.4 runs only on a non-halting Writer verdict (SUITE_DRAFT_WRITTEN or EXISTING_COVERAGE_SUFFICIENT), never on an AMBIGUOUS halt', () => {
  const content = readRepoFile(COMMAND_PATH);
  const section = sectionBody(content, 'Phase A.4 — Command-layer formatting (Prevention)');

  assert.match(section, /This step runs only when the Writer's Phase 3\.2 confirmation/);
  assert.match(section, /reports `SUITE_DRAFT_WRITTEN` or `EXISTING_COVERAGE_SUFFICIENT` —/);
  assert.match(section, /never on an `AMBIGUOUS` halt\./);
});

// ---------------------------------------------------------------------------
// AC-A1 (PRD AC-1) — A.4.1's touched-file collection is a precise set
// operation: UNION(new test files this session, UPDATE-classified ledger
// rows) EXCLUDING DELETE rows and EXISTING_TEST_COVERS mappings; an empty
// set records a distinct "nothing to format" note.
// ---------------------------------------------------------------------------

test('AC-A1: A.4.1 defines the touched-file set as UNION(new files, UPDATE ledger rows) EXCLUDING DELETE rows and EXISTING_TEST_COVERS mappings', () => {
  const content = readRepoFile(COMMAND_PATH);
  const section = sectionBody(content, 'Phase A.4 — Command-layer formatting (Prevention)');

  assert.match(section, /Read the just-written `test-suite\.diff` manifest\. The touched-file/);
  assert.match(section, /set = every path under "## Test files written this session" UNION/);
  assert.match(section, /every UPDATE-classified lifecycle-ledger row's file component\./);
  assert.match(section, /DELETE rows name a file that no longer exists, so they are/);
  assert.match(section, /excluded; `EXISTING_TEST_COVERS` mappings are excluded — that file/);
  assert.match(section, /was not touched this session\./);
});

test('AC-A1: an empty touched-file set skips straight to A.4.4 and records a distinct "nothing to format" note', () => {
  const content = readRepoFile(COMMAND_PATH);
  const section = sectionBody(content, 'Phase A.4 — Command-layer formatting (Prevention)');

  assert.match(section, /If the touched-file set is empty, skip straight to A\.4\.4 and/);
  assert.match(section, /record: "no test files touched this session — formatter not/);
  assert.match(section, /invoked \(nothing to format\)"\./);
});

// ---------------------------------------------------------------------------
// AC-A1 / AC-A2 — A.4.2's discovery chain is a fixed, three-branch,
// strictly-ordered, never-heuristic contract: (a) methodology.md
// formatter_cmd -> (b) package.json scripts.format -> (c) omission.
// ---------------------------------------------------------------------------

test('AC-A1: A.4.2 discovery chain tries exactly three branches, strictly in order (a) methodology.md formatter_cmd -> (b) package.json scripts.format -> (c) omission, and states it is never heuristic', () => {
  const content = readRepoFile(COMMAND_PATH);
  const section = sectionBody(content, 'Phase A.4 — Command-layer formatting (Prevention)');

  assert.match(section, /Three branches, tried in order — never heuristic:/);

  const branchAIdx = section.indexOf('(a) Read `<target_root>/docs/context/methodology.md`');
  const branchBIdx = section.indexOf('(b) Else read `<target_root>/package.json`');
  const branchCIdx = section.indexOf('(c) Else `formatter_cmd = null`');

  assert.notEqual(branchAIdx, -1, 'expected discovery-chain branch (a)');
  assert.notEqual(branchBIdx, -1, 'expected discovery-chain branch (b)');
  assert.notEqual(branchCIdx, -1, 'expected discovery-chain branch (c)');

  assert.ok(branchAIdx < branchBIdx, 'branch (a) must precede branch (b)');
  assert.ok(branchBIdx < branchCIdx, 'branch (b) must precede branch (c)');
});

test('AC-A1: branch (a) sources formatter_cmd from methodology.md frontmatter; branch (b) falls back to package.json scripts.format via the npm "--" pass-through convention', () => {
  const content = readRepoFile(COMMAND_PATH);
  const section = sectionBody(content, 'Phase A.4 — Command-layer formatting (Prevention)');

  assert.match(section, /and extract `formatter_cmd`\. If present, non-null, non-empty:/);
  assert.match(section, /`formatter_cmd = <value>`, `discovery_source = "methodology\.md/);
  assert.match(section, /formatter_cmd"`\. Proceed to A\.4\.3\./);

  assert.match(section, /is a non-empty string: `formatter_cmd = "npm run format --"`/);
  assert.match(section, /\(npm's documented `--` pass-through convention routes appended/);
  assert.match(section, /file-path arguments into the underlying script\),/);
  assert.match(section, /`discovery_source = "package\.json scripts\.format"`\. Proceed to/);
});

// ---------------------------------------------------------------------------
// AC-A2 (PRD AC-2) — the omission branch always records explicitly,
// including the discovery chain attempted, never silently.
// ---------------------------------------------------------------------------

test('AC-A2: branch (c) (no discoverable formatter) records the omission explicitly, naming the discovery chain attempted, and states this is never silent', () => {
  const content = readRepoFile(COMMAND_PATH);
  const section = sectionBody(content, 'Phase A.4 — Command-layer formatting (Prevention)');

  assert.match(section, /formatter_cmd in methodology\.md frontmatter and no package\.json/);
  assert.match(section, /scripts\.format"`\. Record this \*\*omission\*\* explicitly at A\.4\.4 —/);
  assert.match(section, /never silently\./);
});

test('AC-A2: the rendered outcome block names "omitted" as a distinct shape, separate from "nothing to format"', () => {
  const content = readRepoFile(COMMAND_PATH);
  const section = sectionBody(content, 'Phase A.4 — Command-layer formatting (Prevention)');

  assert.match(section, /\*\*nothing to format\*\* — the A\.4\.1 empty-set note\./);
  assert.match(section, /\*\*omitted\*\* — the A\.4\.2 branch-\(c\) discovery-chain-attempted\s+note\./);
});

// ---------------------------------------------------------------------------
// AC-A3 (PRD AC-1) — the invocation is built strictly from the literal
// A.4.1 touched-file list; never a glob, never the whole repo. A durable
// Constraints bullet makes this rule survive independent of A.4.3's wording.
// ---------------------------------------------------------------------------

test('AC-A3: A.4.3 builds the Bash invocation strictly from the literal touched-file list — never a glob, never the whole repo', () => {
  const content = readRepoFile(COMMAND_PATH);
  const section = sectionBody(content, 'Phase A.4 — Command-layer formatting (Prevention)');

  assert.match(section, /When `formatter_cmd` is non-null, run/);
  assert.match(section, /`Bash\("<formatter_cmd> <touched_file_1> <touched_file_2> \.\.\."\)` —/);
  assert.match(section, /the literal touched-file paths from A\.4\.1 appended as trailing/);
  assert.match(section, /arguments, never a glob and never the whole repo \(PRD Risk R1\)\./);
});

test('AC-A3: Constraints carries a durable "Never invoke the formatter unscoped" bullet independent of A.4.3\'s own wording', () => {
  const content = readRepoFile(COMMAND_PATH);
  const section = sectionBody(content, 'Constraints (hard rules)');

  assert.match(section, /\*\*Never invoke the formatter unscoped\.\*\* The `Bash` command Phase/);
  assert.match(section, /A\.4\.3 runs is built by appending the explicit touched-file-path/);
  assert.match(section, /list from A\.4\.1; never a bare `formatter_cmd` call, never `\.`,/);
  assert.match(section, /never a glob\./);
});

// ---------------------------------------------------------------------------
// AC-A6 (PRD AC-1) — A.4.3's exit-code branching: a non-zero exit is
// recorded but never halts the command; a durable Constraints bullet
// reinforces the same non-halting guarantee at the omission branch too.
// ---------------------------------------------------------------------------

test('AC-A6: a non-zero formatter exit is recorded as "formatter invocation failed" but explicitly does NOT halt the command', () => {
  const content = readRepoFile(COMMAND_PATH);
  const section = sectionBody(content, 'Phase A.4 — Command-layer formatting (Prevention)');

  assert.match(section, /Exit code 0 → outcome = "formatted" \(best-effort capture of/);
  assert.match(section, /Non-zero exit → outcome = "formatter invocation failed"; this is/);
  assert.match(section, /recorded but does \*\*not\*\* halt the command\./);
});

test('AC-A6: Constraints carries a durable "A failing or unconfigured formatter never blocks suite authoring" bullet', () => {
  const content = readRepoFile(COMMAND_PATH);
  const section = sectionBody(content, 'Constraints (hard rules)');

  assert.match(section, /\*\*A failing or unconfigured formatter never blocks suite/);
  assert.match(section, /authoring\.\*\* A\.4\.3's non-zero-exit branch and A\.4\.2's omission/);
  assert.match(section, /branch both record and continue; the Writer's DRAFT suite is/);
  assert.match(section, /always surfaced\./);
});

test('AC-A6: an Edit-anchor mismatch at A.4.4 is a soft-fail — a surfaced warning, not a HALT — and leaves *Status: DRAFT* intact', () => {
  const content = readRepoFile(COMMAND_PATH);
  const section = sectionBody(content, 'Phase A.4 — Command-layer formatting (Prevention)');

  assert.match(section, /If the `Edit` fails \(the trailing block text did not match/);
  assert.match(section, /exactly\): this is a \*\*soft-fail\*\* — surface a warning in the/);
  assert.match(section, /command's own narration \(not a HALT\), proceed to Final output/);
  assert.match(section, /surface with `\*Status: DRAFT\*` intact and the formatting outcome/);
  assert.match(section, /explicitly noted as unrecorded in that surfaced warning\./);
});

// ---------------------------------------------------------------------------
// AC-A5 (PRD AC-1) — A.4.4's Edit anchor is grounded byte-for-byte on
// test-writer's own literal manifest template (`## Status` /
// `*Status: DRAFT*`), and the rendered outcome block always carries exactly
// one of four named shapes.
// ---------------------------------------------------------------------------

test('AC-A5: A.4.4\'s Edit call is anchored byte-for-byte on test-writer\'s own literal "## Status" / "*Status: DRAFT*" manifest block', () => {
  const content = readRepoFile(COMMAND_PATH);
  const section = sectionBody(content, 'Phase A.4 — Command-layer formatting (Prevention)');

  assert.match(section, /`old_string`: `"\\n## Status\\n\\n\*Status: DRAFT\*"`/);
  assert.match(section, /`new_string`: `"\\n## Formatting Outcome\\n\\n<rendered outcome/);
  assert.match(section, /block>\\n\\n## Status\\n\\n\*Status: DRAFT\*"`/);
  assert.match(section, /`replace_all`: `false`/);

  // The literal anchor text must also exist verbatim in test-writer.md's
  // own manifest template — otherwise the Edit call above would never
  // match at runtime (the Level 3 DRY-RUN grounding this plan's own
  // Validation Commands check).
  const writerContent = readRepoFile(WRITER_PATH);
  assert.match(writerContent, /^## Status$/m);
  assert.match(writerContent, /^\*Status: DRAFT\*$/m);
});

test('AC-A5: the rendered outcome block enumerates exactly four named shapes (formatted / formatter invocation failed / nothing to format / omitted)', () => {
  const content = readRepoFile(COMMAND_PATH);
  const section = sectionBody(content, 'Phase A.4 — Command-layer formatting (Prevention)');

  assert.match(section, /`<rendered outcome block>` is one of four shapes:/);
  assert.match(section, /\*\*formatted\*\* — command used, discovery source, files touched\./);
  assert.match(section, /\*\*formatter invocation failed\*\* — command attempted, discovery/);
  assert.match(section, /source, exit code, and a note that the DRAFT suite is still/);
  assert.match(section, /surfaced unmodified in outcome\./);
  assert.match(section, /\*\*nothing to format\*\* — the A\.4\.1 empty-set note\./);
  assert.match(section, /\*\*omitted\*\* — the A\.4\.2 branch-\(c\) discovery-chain-attempted/);
});

test('AC-A5: the Final output surface appends one command-owned line, after the Writer\'s own confirmation, enumerating the same four outcome shapes', () => {
  const content = readRepoFile(COMMAND_PATH);
  const section = sectionBody(content, 'Final output surface');

  assert.match(section, /Followed by one command-owned line summarizing the Phase A\.4\s+outcome:/);
  assert.match(section, /> Formatting: <formatted <n> files via <source> \| formatter/);
  assert.match(section, /invocation failed \(exit <code>\) — DRAFT suite surfaced unmodified/);
  assert.match(section, /\| omitted — no formatter discoverable \| nothing to format>\./);
  assert.match(section, /Surface both lines verbatim\. Do not append anything else\./);
});

// ---------------------------------------------------------------------------
// AC-A4 (PRD AC-1; Decisions Log "Prevention ownership" row) —
// test-writer.md's tools allowlist stays byte-identical, reinforced by a
// durable relay-write-test.md "What you do NOT do" bullet.
// ---------------------------------------------------------------------------

test('AC-A4: test-writer.md\'s tools frontmatter line stays byte-identical (Task, Read, Write, Edit, Glob) — zero Bash added', () => {
  const content = readRepoFile(WRITER_PATH);

  assert.match(content, /^tools: Task, Read, Write, Edit, Glob$/m);
  assert.doesNotMatch(content, /^tools:.*Bash.*$/m, 'test-writer.md must never gain Bash — prevention ownership is the command layer');
});

test('AC-A4: relay-write-test.md "What you do NOT do" carries a durable bullet forbidding Bash on test-writer\'s allowlist', () => {
  const content = readRepoFile(COMMAND_PATH);
  const section = sectionBody(content, 'What you do NOT do');

  assert.match(section, /\*\*Never add `Bash` to `test-writer`'s tools allowlist\.\*\*/);
  assert.match(section, /Prevention ownership is the command layer \(this file\); the/);
  assert.match(section, /agent's allowlist stays `Task, Read, Write, Edit, Glob`/);
  assert.match(section, /\(DECIDED constraint\)\./);
});

// ---------------------------------------------------------------------------
// AC-A5 (PRD AC-1) — test-reviewer.md documents reading the
// `## Formatting Outcome` section for informational awareness only: NOT a
// rubric input, and it never grows or shrinks the seven-id rubric taxonomy.
// ---------------------------------------------------------------------------

test('AC-A5: test-reviewer.md Phase 0 documents reading "## Formatting Outcome" as informational only, explicitly NOT a rubric input', () => {
  const content = readRepoFile(REVIEWER_PATH);

  assert.match(content, /A `## Formatting Outcome` section, when present \(informational/);
  assert.match(content, /only — the command-layer record of `\/relay-write-test` Phase/);
  assert.match(content, /A\.4's discovery\/format step; \*\*NOT a rubric input\*\*, and/);
  assert.match(content, /reading it never produces or removes a rubric row\)\./);
});

test('AC-A5: test-reviewer.md\'s canonical rubric-id taxonomy stays at seven ids — no eighth "formatting" id was introduced', () => {
  const content = readRepoFile(REVIEWER_PATH);

  assert.match(content, /Seven rubric ids are the canonical taxonomy:/);
  assert.match(content, /`R-LIFECYCLE-LEGITIMATE`\. Do\s+not invent new ids; if a finding does not fit one of the/);
  assert.match(content, /seven, drop it\./);

  assert.doesNotMatch(
    content,
    /R-FORMAT|R-FMT|R-PREVENTION/,
    'no formatting-specific rubric id may exist — Phase 2\'s AC-A5 is satisfied by an informational read, never a new rubric row'
  );
});
