// @ts-check
/**
 * Unit tests for check E — dispatch-graph — the pure `checkDispatchGraph`
 * function exported by scripts/validate/checks/dispatch-graph.mjs, plus one
 * real-wrapper regression test for the AC-10 scope invariant.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed production module. Exercises the pure function via
 * in-memory command-file fixtures — no real filesystem I/O.
 *
 * Includes dedicated regression coverage for the NAMESPACED
 * `subagent_type: relay:code-reviewer` normalization fix (the regex now
 * captures an optional `relay:` prefix and `.replace()` strips it before
 * the agent-existence lookup and before the finding message is built) — both
 * the bare and namespaced forms are exercised, on both the resolved and
 * unresolved path.
 *
 * Traceability:
 *   PRPs/prds/validation-suite.prd.md AC-6  dispatch graph (check E)
 *   PRPs/prds/validation-suite.prd.md AC-10 scope excludes prp-core
 *
 * Run: node --test scripts/validate/checks/dispatch-graph.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { checkDispatchGraph, runDispatchGraphCheck } from './dispatch-graph.mjs';

const COMMANDS_DIR = 'plugins/relay/commands';

// ---------------------------------------------------------------------------
// PRPs/prds/validation-suite.prd.md AC-6 — dispatch graph
// ---------------------------------------------------------------------------

test('checkDispatchGraph: ok:true with no findings when every subagent_type and Next: pointer resolves', () => {
  const result = checkDispatchGraph({
    commandFiles: [
      { path: 'plugins/relay/commands/relay-plan.md', content: 'Dispatch via subagent_type: plan-writer.\nNext: /relay-plan-review\n' },
      { path: 'plugins/relay/commands/relay-plan-review.md', content: 'Review command.\n' },
    ],
    agentNames: ['plan-writer'],
  });

  assert.equal(result.name, 'dispatch-graph');
  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

test('checkDispatchGraph: fails naming an unresolved BARE subagent_type reference', () => {
  const result = checkDispatchGraph({
    commandFiles: [{ path: 'plugins/relay/commands/relay-plan.md', content: 'Dispatch via subagent_type: ghost-agent.\n' }],
    agentNames: ['plan-writer'],
  });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /ghost-agent/);
  assert.equal(result.findings[0].file, 'plugins/relay/commands/relay-plan.md');
  assert.equal(result.findings[0].line, 1);
});

test('checkDispatchGraph: NAMESPACED subagent_type "relay:code-reviewer" normalizes to "code-reviewer" and resolves (regression: the just-fixed namespace-prefix bug)', () => {
  const result = checkDispatchGraph({
    commandFiles: [{ path: 'plugins/relay/commands/relay-code-review.md', content: 'Task(subagent_type: relay:code-reviewer)\n' }],
    agentNames: ['code-reviewer'],
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

test('checkDispatchGraph: an unresolved NAMESPACED subagent_type reference is reported using the NORMALIZED name, never the raw "relay:x" form', () => {
  const result = checkDispatchGraph({
    commandFiles: [{ path: 'plugins/relay/commands/relay-code-review.md', content: 'Task(subagent_type: relay:ghost-agent)\n' }],
    agentNames: ['plan-writer'],
  });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /"ghost-agent"/);
  assert.doesNotMatch(result.findings[0].message, /relay:ghost-agent/);
});

test('checkDispatchGraph: fails naming an unresolved Next: pointer', () => {
  const result = checkDispatchGraph({
    commandFiles: [{ path: 'plugins/relay/commands/relay-plan.md', content: 'Next: /relay-ghost-command\n' }],
    agentNames: [],
  });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /relay-ghost-command/);
  assert.equal(result.findings[0].file, 'plugins/relay/commands/relay-plan.md');
  assert.equal(result.findings[0].line, 1);
});

test('checkDispatchGraph: a NAMESPACED Next: pointer "/relay:relay-plan-review" resolves the same as the bare form', () => {
  const result = checkDispatchGraph({
    commandFiles: [
      { path: 'plugins/relay/commands/relay-plan.md', content: 'Next: /relay:relay-plan-review\n' },
      { path: 'plugins/relay/commands/relay-plan-review.md', content: 'Review.\n' },
    ],
    agentNames: [],
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

test('checkDispatchGraph: a "/relay-x" mention on a line WITHOUT the literal "Next:" token is never validated (precision — avoids false positives on ordinary prose)', () => {
  const result = checkDispatchGraph({
    commandFiles: [{
      path: 'plugins/relay/commands/relay-plan.md',
      // Deliberately carries no "Next:" substring anywhere in the line — an
      // earlier draft of this fixture accidentally embedded the literal
      // word "Next:" inside its own explanatory prose, which self-triggered
      // the very pointer-scan this test means to prove is SKIPPED.
      content: 'See also /relay-ghost-thing for details (this line carries no dispatch-pointer marker whatsoever).\n',
    }],
    agentNames: [],
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

// ---------------------------------------------------------------------------
// Robustness — missing/malformed inputs are a loud-failure finding, never a
// throw and never a silent pass.
// ---------------------------------------------------------------------------

test('checkDispatchGraph: reports a loud failing finding (not a throw) when commandFiles is missing/empty', () => {
  for (const commandFiles of [null, undefined, []]) {
    const result = checkDispatchGraph({ commandFiles, agentNames: [] });
    assert.equal(result.ok, false);
    assert.equal(result.findings.length, 1);
    assert.equal(result.findings[0].file, COMMANDS_DIR);
  }
});

test('checkDispatchGraph: reports a loud failing finding for a command file that could not be read (content: null), never a throw', () => {
  const result = checkDispatchGraph({
    commandFiles: [{ path: 'plugins/relay/commands/relay-broken.md', content: null }],
    agentNames: [],
  });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /could not read/);
  assert.equal(result.findings[0].file, 'plugins/relay/commands/relay-broken.md');
});

test('checkDispatchGraph: treats a missing/null agentNames as an empty set (fails every subagent_type reference) rather than throwing', () => {
  assert.doesNotThrow(() => {
    const result = checkDispatchGraph({
      commandFiles: [{ path: 'plugins/relay/commands/relay-plan.md', content: 'subagent_type: plan-writer\n' }],
      agentNames: null,
    });
    assert.equal(result.ok, false);
    assert.equal(result.findings.length, 1);
    assert.match(result.findings[0].message, /plan-writer/);
  });
});

// ---------------------------------------------------------------------------
// PRPs/prds/validation-suite.prd.md AC-10 — scope excludes prp-core. This is
// a property of the WRAPPER's hardcoded scan roots (plugins/relay/commands,
// plugins/relay/agents — never plugins/prp-core), so it is asserted here
// against the real wrapper and the real repo tree rather than a fixture.
// ---------------------------------------------------------------------------

test('runDispatchGraphCheck: never emits a finding whose file resolves under plugins/prp-core', () => {
  const result = runDispatchGraphCheck();
  for (const finding of result.findings) {
    assert.ok(
      !finding.file || !finding.file.startsWith('plugins/prp-core'),
      `finding must never reference plugins/prp-core, got: ${JSON.stringify(finding)}`
    );
  }
});
