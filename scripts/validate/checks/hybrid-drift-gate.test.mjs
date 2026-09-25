// @ts-check
/**
 * Unit tests for check — hybrid drift gate — the pure `checkHybridDriftGate`
 * function exported by scripts/validate/checks/hybrid-drift-gate.mjs.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented production
 * module, mirroring diff-base-form.test.mjs's shape: exercise the pure
 * function via in-memory fixture strings, plus one real-wrapper smoke test.
 *
 * PRPs/prds/hybrid-code-review.prd.md AC-12 — the behavior that matters most:
 * a recall below the configured threshold must ship with disabled:true and a
 * non-empty reason, and a missing/corrupt status file must fail OPEN (the
 * hybrid pass keeps running) rather than closed. This check enforces the
 * *recorded-file* half of that contract (schema + internal consistency +
 * wiring); the fail-open behavior itself lives in code-reviewer.md's step 0
 * prose, verified separately by this check's `agentText` assertions (the
 * markers step 0 must contain) and by the plan's own grep-based VALIDATE.
 *
 * Run: node --test scripts/validate/checks/hybrid-drift-gate.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { checkHybridDriftGate, runHybridDriftGateCheck } from './hybrid-drift-gate.mjs';

const STATUS_PATH = 'plugins/relay/resources/drift-gate-status.json';
const AGENT_PATH = 'plugins/relay/agents/code-reviewer.md';

const VALID_AGENT_TEXT = [
  '## The hybrid /code-review pass',
  '0. Drift gate check. Read `${CLAUDE_PLUGIN_ROOT}/resources/drift-gate-status.json`.',
  'If disabled, set local state with reason `DRIFT_GATE_DISABLED:<reason>` and do NOT invoke Skill.',
].join('\n');

function shippedDefaultStatus() {
  return JSON.stringify({
    disabled: false,
    reason: null,
    recall: null,
    threshold: 8,
    sample_count: 10,
    measured_at: null,
  });
}

function degradedDisabledStatus() {
  return JSON.stringify({
    disabled: true,
    reason: 'recall 5/8 below threshold',
    recall: 5,
    threshold: 8,
    sample_count: 10,
    measured_at: '2026-09-23T00:00:00.000Z',
  });
}

test('checkHybridDriftGate: ok:true on the shipped default status (disabled:false, recall:null) plus wired agent text', () => {
  const result = checkHybridDriftGate({ statusText: shippedDefaultStatus(), agentText: VALID_AGENT_TEXT });

  assert.equal(result.name, 'hybrid-drift-gate');
  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

test('checkHybridDriftGate: ok:true on a legitimately degraded, internally consistent disabled:true record (AC-12 core scenario)', () => {
  const result = checkHybridDriftGate({ statusText: degradedDisabledStatus(), agentText: VALID_AGENT_TEXT });

  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

test('checkHybridDriftGate: fires when recall < threshold but disabled is recorded false (AC-12: a degraded recall MUST disable the gate)', () => {
  const status = JSON.parse(degradedDisabledStatus());
  status.disabled = false; // hand-edited/stale — recall says disable, flag says don't
  const result = checkHybridDriftGate({ statusText: JSON.stringify(status), agentText: VALID_AGENT_TEXT });

  assert.equal(result.ok, false);
  assert.ok(result.findings.some((f) => /inconsistent with recall/.test(f.message)));
});

test('checkHybridDriftGate: fires when disabled:true carries an empty-string reason (AC-12: disabled must always carry a logged reason)', () => {
  const status = JSON.parse(degradedDisabledStatus());
  status.reason = '';
  const result = checkHybridDriftGate({ statusText: JSON.stringify(status), agentText: VALID_AGENT_TEXT });

  assert.equal(result.ok, false);
  assert.ok(result.findings.some((f) => /must carry a non-empty reason/.test(f.message)));
});

test('checkHybridDriftGate: fires when disabled:true carries a null reason', () => {
  const status = JSON.parse(degradedDisabledStatus());
  status.reason = null;
  const result = checkHybridDriftGate({ statusText: JSON.stringify(status), agentText: VALID_AGENT_TEXT });

  assert.equal(result.ok, false);
  assert.ok(result.findings.some((f) => /must carry a non-empty reason/.test(f.message)));
});

test('checkHybridDriftGate: fires on a status file missing a required key', () => {
  const status = JSON.parse(shippedDefaultStatus());
  delete status.threshold;
  const result = checkHybridDriftGate({ statusText: JSON.stringify(status), agentText: VALID_AGENT_TEXT });

  assert.equal(result.ok, false);
  assert.ok(result.findings.some((f) => /missing required key "threshold"/.test(f.message)));
});

test('checkHybridDriftGate: fires on malformed JSON in the status file rather than throwing', () => {
  const result = checkHybridDriftGate({ statusText: '{ not valid json', agentText: VALID_AGENT_TEXT });

  assert.equal(result.ok, false);
  assert.ok(result.findings.some((f) => /failed to JSON\.parse/.test(f.message)));
});

test('checkHybridDriftGate: a missing/unreadable status file (null) is a loud finding, not a silent pass', () => {
  const result = checkHybridDriftGate({ statusText: null, agentText: VALID_AGENT_TEXT });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].file, STATUS_PATH);
  assert.match(result.findings[0].message, /missing or unreadable file/);
});

test('checkHybridDriftGate: an undefined status file is treated the same as null', () => {
  const result = checkHybridDriftGate({ statusText: undefined, agentText: VALID_AGENT_TEXT });

  assert.equal(result.ok, false);
  assert.match(result.findings[0].message, /missing or unreadable file/);
});

test('checkHybridDriftGate: fires when code-reviewer.md does not contain the DRIFT_GATE_DISABLED marker (unwired reviewer)', () => {
  const result = checkHybridDriftGate({
    statusText: shippedDefaultStatus(),
    agentText: 'no gate-read step here at all',
  });

  assert.equal(result.ok, false);
  assert.ok(result.findings.some((f) => f.file === AGENT_PATH && /DRIFT_GATE_DISABLED/.test(f.message)));
});

test('checkHybridDriftGate: fires when code-reviewer.md does not reference the status file path (reviewer never reads the gate)', () => {
  const result = checkHybridDriftGate({
    statusText: shippedDefaultStatus(),
    agentText: 'DRIFT_GATE_DISABLED is mentioned but no path to the status file',
  });

  assert.equal(result.ok, false);
  assert.ok(result.findings.some((f) => f.file === AGENT_PATH && /drift-gate-status\.json/.test(f.message)));
});

test('checkHybridDriftGate: a missing/unreadable agent file (null) is a loud finding, not a silent pass', () => {
  const result = checkHybridDriftGate({ statusText: shippedDefaultStatus(), agentText: null });

  assert.equal(result.ok, false);
  assert.ok(result.findings.some((f) => f.file === AGENT_PATH && /missing or unreadable file/.test(f.message)));
});

test('checkHybridDriftGate: reports independent findings from both inputs when both are broken (no short-circuit)', () => {
  const result = checkHybridDriftGate({ statusText: null, agentText: null });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 2);
  assert.deepEqual(
    result.findings.map((f) => f.file).sort(),
    [AGENT_PATH, STATUS_PATH].sort(),
  );
});

test('runHybridDriftGateCheck: real wrapper reads the shipped files and reports ok:true against the current tree', () => {
  const result = runHybridDriftGateCheck();

  assert.equal(result.name, 'hybrid-drift-gate');
  assert.equal(result.ok, true, JSON.stringify(result.findings));
});
