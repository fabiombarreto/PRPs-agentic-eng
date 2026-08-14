// @ts-check
/**
 * Tests for Phase 4 ("Validation + registry") of the usage-metrics feature —
 * the metrics-isolation check, the CONSUMERS registration, and the
 * OWNED_RESOURCES registration.
 *
 * The isolation check is the anti-Goodhart guard converted from a prose promise
 * into a build invariant, so the tests exercise BOTH polarities against the
 * pure function: a clean file set passes, and a planted reference fails with a
 * usable file:line. Asserting only that the check exists would test nothing.
 *
 * Authored test-after per `docs/context/methodology.md`.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { checkMetricsIsolation, runMetricsIsolationCheck } from './metrics-isolation.mjs';

// ---------------------------------------------------------------------------
// AC-A1 (PRD AC-5) — the isolation check fails on a planted reference.
// ---------------------------------------------------------------------------

test('AC-A1 (PRD AC-5): a clean file set passes', () => {
  const result = checkMetricsIsolation({
    files: [
      { path: 'plugins/relay/agents/x.md', content: 'Read the plan and execute its tasks.\n' },
      { path: 'plugins/relay/commands/y.md', content: 'Dispatch the reviewer.\n' },
    ],
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
  assert.equal(result.name, 'metrics-isolation');
});

test('AC-A1 (PRD AC-5): a planted metrics-path reference fails with a usable file and line', () => {
  const result = checkMetricsIsolation({
    files: [
      { path: 'plugins/relay/agents/x.md', content: 'line one\nRead PRPs/metrics/verdict-v1-2026-08.tsv for context.\nline three\n' },
    ],
  });
  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].file, 'plugins/relay/agents/x.md');
  assert.equal(result.findings[0].line, 2, 'the finding must point at the offending line, not the file');
  assert.match(result.findings[0].message, /approve leniently/, 'the message must explain why, not merely that it failed');
});

test('AC-A1 (PRD AC-5): a quoted prohibition is allowed — a rule about the path is not an instruction to read it', () => {
  const result = checkMetricsIsolation({
    files: [
      { path: 'plugins/relay/agents/x.md', content: 'An agent must never read PRPs/metrics/ shards.\n' },
      { path: 'plugins/relay/commands/y.md', content: 'Referencing PRPs/metrics is forbidden for any dispatched agent.\n' },
    ],
  });
  assert.equal(result.ok, true, 'a line phrased as a prohibition must not trip the check');
});

test('AC-A1 (PRD AC-5): the real tree passes — the guard holds against the shipped plugin', () => {
  const result = runMetricsIsolationCheck();
  assert.equal(
    result.ok,
    true,
    `expected no agent/command/skill to reference the metrics path; found: ${JSON.stringify(result.findings)}`
  );
});

// ---------------------------------------------------------------------------
// AC-A2 (PRD AC-8) — the reader is a registered consumer of the degraded-
// timestamp contract, so producer/consumer drift is caught by validate.
// ---------------------------------------------------------------------------

test('AC-A2 (PRD AC-8): the materializer is registered in the CONSUMERS array', () => {
  const src = readFileSync(resolve('scripts/validate/checks/timestamp-contract.mjs'), 'utf8');
  assert.match(
    src,
    /const CONSUMERS = \[[^\]]*'plugins\/relay\/scripts\/usage-metrics\.mjs'/,
    'the reader must be a registered consumer so a future edit dropping its degraded handling fails the build'
  );
});

test('AC-A2 (PRD AC-8): the materializer actually references timestamp_degraded in executable code', () => {
  const src = readFileSync(resolve('plugins/relay/scripts/usage-metrics.mjs'), 'utf8');
  const withoutComments = src
    .split('\n')
    .filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l))
    .join('\n');
  assert.match(
    withoutComments,
    /timestamp_degraded/,
    'the CONSUMERS registration asserts a real contract, so the reference must survive comment-stripping'
  );
});

// ---------------------------------------------------------------------------
// AC-A3 — the schema resource is registered so a miscitation is caught.
// ---------------------------------------------------------------------------

test('AC-A3: the codebook basename is registered in OWNED_RESOURCES', () => {
  const src = readFileSync(resolve('scripts/validate/checks/plugin-root-resolvable.mjs'), 'utf8');
  assert.match(
    src,
    /'usage-metrics-schema\.md'/,
    'without this entry a miscited codebook path goes uncaught'
  );
  assert.doesNotMatch(
    src,
    /The eight resource basenames/,
    'the count comment must track the array it describes'
  );
});

// ---------------------------------------------------------------------------
// AC-A4 — the shard sanity check stays off the pre-commit path.
// ---------------------------------------------------------------------------

test('AC-A4: shard-content sanity is reported by the reader, never by the pre-commit gate', () => {
  const indexSrc = readFileSync(resolve('scripts/validate/index.mjs'), 'utf8');
  assert.match(indexSrc, /runMetricsIsolationCheck/, 'the isolation check IS registered — it inspects prompts, not data');

  const isolationSrc = readFileSync(resolve('scripts/validate/checks/metrics-isolation.mjs'), 'utf8');
  assert.doesNotMatch(
    isolationSrc,
    /\.tsv['"]\s*\)/,
    'no validate check may parse shard contents: npm run validate is the pre-commit gate, and a corrupted measurement artifact must never block a commit'
  );

  const readerSrc = readFileSync(resolve('plugins/relay/scripts/usage-metrics.mjs'), 'utf8');
  assert.match(
    readerSrc,
    /must never be able to block a commit/,
    'the reader must record why the sanity check lives there rather than in the gate'
  );
});
