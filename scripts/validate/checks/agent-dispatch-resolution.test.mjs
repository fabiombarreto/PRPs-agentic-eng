// @ts-check
/**
 * Unit tests for check U — agent-dispatch-resolution — the pure
 * `checkAgentDispatchResolution` function exported by
 * scripts/validate/checks/agent-dispatch-resolution.mjs.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed production module. Exercises the pure function only, via
 * in-memory fixture strings — no temp files, no real file I/O, no exercise of
 * the `runAgentDispatchResolutionCheck()` fs wrapper.
 *
 * Traceability:
 *   PRPs/prds/parallel-phase-execution.prd.md AC-9  lane dispatch depends on an
 *                                                    agent-dispatch mechanism
 *   Plan AC-A4                                      a finding for an
 *                                                    unresolvable subagent_type,
 *                                                    a dispatching agent with no
 *                                                    dispatch tool, zero dispatch
 *                                                    references and an unreadable
 *                                                    agent — and a pass for a
 *                                                    valid dispatch
 *
 * Why this check exists at all: `dispatch-graph` scopes itself to command files
 * and says so, leaving `code-reviewer` -> `code-reviewer-semantic` — the edge
 * that carries the whole R-SEM semantic layer — resolved by nothing. A dispatch
 * that cannot be made fails quietly: the parent reports the rubric rows it did
 * run, and the missing row is indistinguishable from a row that passed.
 *
 * The tests deliberately do NOT assert that `Task` is the correct tool name.
 * Whether it resolves at runtime is a behavioural question a static check cannot
 * settle, and the module treats both names as acceptable for that reason.
 *
 * Run: node --test scripts/validate/checks/agent-dispatch-resolution.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { checkAgentDispatchResolution } from './agent-dispatch-resolution.mjs';

const NL = String.fromCharCode(10);
const NAMES = new Set(['helper', 'caller', 'code-reviewer-semantic']);

/** An agent that dispatches `helper` and declares Task. */
const VALID = ['---', 'name: caller', 'tools: Read, Task', '---', '', 'Dispatch subagent_type: helper to do the work.'].join(NL);

test('a resolvable dispatch by an agent declaring a dispatch tool passes', () => {
  const result = checkAgentDispatchResolution({ agents: { 'caller.md': VALID }, agentNames: NAMES });
  assert.equal(result.name, 'agent-dispatch-resolution');
  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

test('an unresolvable subagent_type is a finding naming the target', () => {
  const ghost = VALID.replace('subagent_type: helper', 'subagent_type: ghost');
  const result = checkAgentDispatchResolution({ agents: { 'caller.md': ghost }, agentNames: NAMES });
  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /"ghost"/);
  assert.match(result.findings[0].message, /resolves to no agent file/);
});

test('a dispatching agent that declares NO dispatch tool is a finding listing what it does declare', () => {
  const noTool = VALID.replace('tools: Read, Task', 'tools: Read, Grep');
  const result = checkAgentDispatchResolution({ agents: { 'caller.md': noTool }, agentNames: NAMES });
  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /declares no dispatch tool/);
  assert.match(result.findings[0].message, /Read, Grep/);
});

test('either accepted tool name satisfies the declaration requirement', () => {
  // The check enforces that SOME dispatch tool is declared, deliberately not
  // which one: whether `Task` resolves at runtime is not statically decidable.
  const withAgent = VALID.replace('tools: Read, Task', 'tools: Read, Agent');
  assert.equal(checkAgentDispatchResolution({ agents: { 'a.md': withAgent }, agentNames: NAMES }).ok, true);
  assert.equal(checkAgentDispatchResolution({ agents: { 'a.md': VALID }, agentNames: NAMES }).ok, true);
});

test('a custom dispatchToolNames set is honoured', () => {
  const result = checkAgentDispatchResolution({
    agents: { 'caller.md': VALID },
    agentNames: NAMES,
    dispatchToolNames: ['Agent'],
  });
  assert.equal(result.ok, false);
  assert.match(result.findings[0].message, /expected one of Agent/);
});

test('an agent with no frontmatter at all that dispatches is a finding', () => {
  const bare = 'Dispatch subagent_type: helper with no frontmatter.';
  const result = checkAgentDispatchResolution({ agents: { 'caller.md': bare }, agentNames: NAMES });
  assert.equal(result.ok, false);
  assert.match(result.findings[0].message, /declared tools: none/);
});

test('the call-form spelling subagent_type="name" is recognised', () => {
  const callForm = ['---', 'tools: Task', '---', 'Task(subagent_type="helper", prompt=x)'].join(NL);
  assert.equal(checkAgentDispatchResolution({ agents: { 'a.md': callForm }, agentNames: NAMES }).ok, true);

  const callFormGhost = callForm.replace('"helper"', '"ghost"');
  assert.equal(checkAgentDispatchResolution({ agents: { 'a.md': callFormGhost }, agentNames: NAMES }).ok, false);
});

test('a subagent_type appearing ONLY in frontmatter is not treated as a dispatch site', () => {
  // The frontmatter description often names agents in prose; treating that as a
  // dispatch would make the tool requirement fire on agents that never dispatch.
  const fmOnly = ['---', 'description: mentions subagent_type: helper in prose', 'tools: Read', '---', '', 'Body with no dispatch.'].join(NL);
  const result = checkAgentDispatchResolution({ agents: { 'a.md': fmOnly }, agentNames: NAMES });
  // No dispatch sites at all -> the vacuity guard fires, not a tool finding.
  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /passes by vacuity/);
});

test('ZERO dispatch references across all agents is a finding', () => {
  const result = checkAgentDispatchResolution({
    agents: { 'a.md': ['---', 'tools: Read', '---', 'No dispatch here.'].join(NL) },
    agentNames: NAMES,
  });
  assert.equal(result.ok, false);
  assert.match(result.findings[0].message, /passes by vacuity/);
});

test('an unreadable agent is a loud finding, never a silent pass', () => {
  const result = checkAgentDispatchResolution({
    agents: { 'caller.md': null, 'other.md': VALID },
    agentNames: NAMES,
  });
  assert.equal(result.ok, false);
  assert.ok(result.findings.some((f) => /missing or unreadable agent file/.test(f.message)));
});

test('an agent with several dispatch sites has each resolved independently', () => {
  const many = ['---', 'tools: Task', '---',
    'subagent_type: helper',
    'subagent_type: ghost',
    'subagent_type: code-reviewer-semantic',
    'subagent_type: phantom'].join(NL);
  const result = checkAgentDispatchResolution({ agents: { 'a.md': many }, agentNames: NAMES });
  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 2);
  const msgs = result.findings.map((f) => f.message).join(' ');
  assert.match(msgs, /"ghost"/);
  assert.match(msgs, /"phantom"/);
});

test('a finding carries a line number that accounts for the frontmatter offset', () => {
  const result = checkAgentDispatchResolution({
    agents: { 'a.md': VALID.replace('subagent_type: helper', 'subagent_type: ghost') },
    agentNames: NAMES,
  });
  assert.equal(result.ok, false);
  assert.ok(result.findings[0].line > 4, 'line must point past the frontmatter, not into it');
});

test('an agentNames array is accepted as well as a Set', () => {
  const result = checkAgentDispatchResolution({
    agents: { 'caller.md': VALID },
    agentNames: ['helper', 'caller'],
  });
  assert.equal(result.ok, true);
});

test('a missing agents object does not throw', () => {
  const result = checkAgentDispatchResolution({ agents: undefined, agentNames: NAMES });
  assert.equal(result.ok, false);
  assert.match(result.findings[0].message, /passes by vacuity/);
});

test('CRLF line endings are handled', () => {
  const crlf = VALID.split(NL).join('\r\n');
  assert.equal(checkAgentDispatchResolution({ agents: { 'a.md': crlf }, agentNames: NAMES }).ok, true);
});
