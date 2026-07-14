// @ts-check
/**
 * Unit tests for check F — frontmatter-schema — the pure
 * `checkFrontmatterSchema` function exported by
 * scripts/validate/checks/frontmatter-schema.mjs, plus one real-wrapper
 * regression test for the AC-10 scope invariant.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed production module. `files` entries arrive already-parsed
 * (mirroring what the wrapper's `extractFrontmatter` produces) — these
 * tests exercise the ajv-backed validation + the agent-name/filename-stem
 * cross-check entirely via in-memory fixtures, no real filesystem I/O
 * (except the dedicated AC-10 test, which calls the real
 * `runFrontmatterSchemaCheck()` wrapper against the actual repo tree).
 *
 * Traceability:
 *   PRPs/prds/validation-suite.prd.md AC-7  frontmatter schema (check F)
 *   PRPs/prds/validation-suite.prd.md AC-10 scope excludes prp-core
 *
 * Run: node --test scripts/validate/checks/frontmatter-schema.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { checkFrontmatterSchema, runFrontmatterSchemaCheck } from './frontmatter-schema.mjs';

// ---------------------------------------------------------------------------
// PRPs/prds/validation-suite.prd.md AC-7 — frontmatter schema: command kind
// ---------------------------------------------------------------------------

test('checkFrontmatterSchema: ok:true for a valid command frontmatter (description + argument-hint, no name)', () => {
  const result = checkFrontmatterSchema({
    files: [{
      path: 'plugins/relay/commands/relay-plan.md',
      kind: 'command',
      frontmatter: { description: 'Autonomous plan generation.', 'argument-hint': '<prd-path>' },
    }],
  });

  assert.equal(result.name, 'frontmatter-schema');
  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

test('checkFrontmatterSchema: fails a command carrying a forbidden "name" field', () => {
  const result = checkFrontmatterSchema({
    files: [{
      path: 'plugins/relay/commands/relay-plan.md',
      kind: 'command',
      frontmatter: { description: 'x', 'argument-hint': 'y', name: 'relay-plan' },
    }],
  });

  assert.equal(result.ok, false);
  assert.ok(result.findings.length >= 1);
  assert.ok(result.findings.every((f) => f.file === 'plugins/relay/commands/relay-plan.md'));
});

test('checkFrontmatterSchema: fails a command missing the required "description" field', () => {
  const result = checkFrontmatterSchema({
    files: [{ path: 'plugins/relay/commands/relay-plan.md', kind: 'command', frontmatter: { 'argument-hint': 'y' } }],
  });

  assert.equal(result.ok, false);
  assert.ok(result.findings.some((f) => /description/.test(f.message)));
});

// ---------------------------------------------------------------------------
// PRPs/prds/validation-suite.prd.md AC-7 — frontmatter schema: agent kind
// ---------------------------------------------------------------------------

test('checkFrontmatterSchema: ok:true for a valid agent frontmatter whose name matches the filename stem', () => {
  const result = checkFrontmatterSchema({
    files: [{
      path: 'plugins/relay/agents/plan-writer.md',
      kind: 'agent',
      frontmatter: { name: 'plan-writer', description: 'd', model: 'sonnet', color: 'orange', tools: 'Task, Read' },
    }],
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

test('checkFrontmatterSchema: fails an agent missing the required "tools" field', () => {
  const result = checkFrontmatterSchema({
    files: [{
      path: 'plugins/relay/agents/plan-writer.md',
      kind: 'agent',
      frontmatter: { name: 'plan-writer', description: 'd', model: 'sonnet', color: 'orange' },
    }],
  });

  assert.equal(result.ok, false);
  assert.ok(result.findings.some((f) => /tools/.test(f.message)));
});

test('checkFrontmatterSchema: fails (code-level cross-check) when agent frontmatter "name" does not equal the filename stem', () => {
  const result = checkFrontmatterSchema({
    files: [{
      path: 'plugins/relay/agents/bar.md',
      kind: 'agent',
      frontmatter: { name: 'foo', description: 'd', model: 'sonnet', color: 'orange', tools: 'Task' },
    }],
  });

  assert.equal(result.ok, false);
  const stemFinding = result.findings.find((f) => /does not match filename stem/.test(f.message));
  assert.ok(stemFinding, 'expected a filename-stem-mismatch finding');
  assert.match(stemFinding.message, /"foo"/);
  assert.match(stemFinding.message, /"bar"/);
});

// ---------------------------------------------------------------------------
// PRPs/prds/validation-suite.prd.md AC-7 — frontmatter schema: skill kind
// ---------------------------------------------------------------------------

test('checkFrontmatterSchema: ok:true for a valid skill frontmatter (name + description)', () => {
  const result = checkFrontmatterSchema({
    files: [{
      path: 'plugins/relay/skills/context-builder/SKILL.md',
      kind: 'skill',
      frontmatter: { name: 'context-builder', description: 'd' },
    }],
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

test('checkFrontmatterSchema: fails a skill missing the required "description" field', () => {
  const result = checkFrontmatterSchema({
    files: [{ path: 'plugins/relay/skills/context-builder/SKILL.md', kind: 'skill', frontmatter: { name: 'context-builder' } }],
  });

  assert.equal(result.ok, false);
  assert.ok(result.findings.some((f) => /description/.test(f.message)));
});

// ---------------------------------------------------------------------------
// Robustness — missing/malformed inputs are a loud-failure finding, never a
// throw and never a silent pass. Also exercises the ajv `validate.errors`
// copy-before-reuse risk documented in the plan's Risks table (Task 3/AC-A5):
// two invalid files validated back-to-back must each keep their OWN errors,
// never clobbered by the next file's validate() call.
// ---------------------------------------------------------------------------

test('checkFrontmatterSchema: reports a loud failing finding (not a throw) when files is missing/empty', () => {
  for (const files of [null, undefined, []]) {
    const result = checkFrontmatterSchema({ files });
    assert.equal(result.ok, false);
    assert.equal(result.findings.length, 1);
    assert.match(result.findings[0].message, /no frontmatter-bearing files found/);
  }
});

test('checkFrontmatterSchema: surfaces the wrapper-supplied parse error verbatim for a file with unparseable frontmatter, never a throw', () => {
  const result = checkFrontmatterSchema({
    files: [{
      path: 'plugins/relay/commands/broken.md',
      kind: 'command',
      frontmatter: null,
      error: 'no closing --- frontmatter fence found',
    }],
  });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].message, 'no closing --- frontmatter fence found');
  assert.equal(result.findings[0].file, 'plugins/relay/commands/broken.md');
});

test('checkFrontmatterSchema: fails naming an unknown component kind, never a throw', () => {
  const result = checkFrontmatterSchema({
    files: [{ path: 'plugins/relay/weird/thing.md', kind: 'weird', frontmatter: {} }],
  });

  assert.equal(result.ok, false);
  assert.ok(result.findings.some((f) => /unknown component kind/.test(f.message)));
});

test('checkFrontmatterSchema: validating two invalid files back-to-back attributes the RIGHT errors to the RIGHT file (ajv validate.errors copy-before-reuse)', () => {
  const result = checkFrontmatterSchema({
    files: [
      { path: 'plugins/relay/commands/relay-a.md', kind: 'command', frontmatter: { 'argument-hint': 'x' } }, // missing description
      {
        path: 'plugins/relay/agents/agent-b.md',
        kind: 'agent',
        frontmatter: { name: 'agent-b', description: 'd', model: 'sonnet', color: 'orange' }, // missing tools
      },
    ],
  });

  assert.equal(result.ok, false);
  const commandFindings = result.findings.filter((f) => f.file === 'plugins/relay/commands/relay-a.md');
  const agentFindings = result.findings.filter((f) => f.file === 'plugins/relay/agents/agent-b.md');
  assert.ok(commandFindings.some((f) => /description/.test(f.message)), 'command file must be attributed its own "description" error');
  assert.ok(agentFindings.some((f) => /tools/.test(f.message)), 'agent file must be attributed its own "tools" error, not clobbered by the command file\'s error');
});

// ---------------------------------------------------------------------------
// PRPs/prds/validation-suite.prd.md AC-10 — scope excludes prp-core. This is
// a property of the WRAPPER's hardcoded component directories
// (plugins/relay/commands, plugins/relay/agents, plugins/relay/skills —
// never plugins/prp-core), so it is asserted here against the real wrapper
// and the real repo tree rather than a fixture.
// ---------------------------------------------------------------------------

test('runFrontmatterSchemaCheck: never emits a finding whose file resolves under plugins/prp-core', () => {
  const result = runFrontmatterSchemaCheck();
  for (const finding of result.findings) {
    assert.ok(
      !finding.file || !finding.file.startsWith('plugins/prp-core'),
      `finding must never reference plugins/prp-core, got: ${JSON.stringify(finding)}`
    );
  }
});
