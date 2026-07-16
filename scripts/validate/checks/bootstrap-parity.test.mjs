// @ts-check
/**
 * Unit tests for check P — bootstrap-parity — the pure
 * `checkBootstrapParity` function exported by
 * scripts/validate/checks/bootstrap-parity.mjs.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed production module. Exercises the pure function via
 * in-memory SKILL.md text fixtures — no real filesystem I/O.
 *
 * AC-10 (prp-core scope) does not apply to this check: it reads exactly one
 * hardcoded file (`plugins/relay/skills/context-builder/SKILL.md`), not a
 * directory scan, so cross-plugin scope leakage is structurally impossible.
 *
 * Traceability:
 *   PRPs/prds/validation-suite.prd.md AC-13 `.sh`/`.ps1` bootstrap parity (check P)
 *
 * Run: node --test scripts/validate/checks/bootstrap-parity.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { checkBootstrapParity } from './bootstrap-parity.mjs';

const SKILL_MD_PATH = 'plugins/relay/skills/context-builder/SKILL.md';

// ---------------------------------------------------------------------------
// PRPs/prds/validation-suite.prd.md AC-13 — .sh/.ps1 bootstrap parity
// ---------------------------------------------------------------------------

test('checkBootstrapParity: ok:true with no findings when both worktree-bootstrap.sh and .ps1 templates are emitted', () => {
  const result = checkBootstrapParity({
    skillMd: 'Emits scripts/worktree-bootstrap.sh and scripts/worktree-bootstrap.ps1 templates.',
  });

  assert.equal(result.name, 'bootstrap-parity');
  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

test('checkBootstrapParity: ok:true with no findings when NEITHER template is emitted', () => {
  const result = checkBootstrapParity({
    skillMd: 'No bootstrap templates mentioned here at all.',
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

test('checkBootstrapParity: catches the PRD AC-13 worked example — .sh emitted with no matching .ps1 (hole #5 shape)', () => {
  const result = checkBootstrapParity({
    skillMd: 'Emits scripts/worktree-bootstrap.sh only, no .ps1 sibling anywhere in this doc.',
  });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /worktree-bootstrap\.ps1/);
  assert.equal(result.findings[0].file, SKILL_MD_PATH);
});

test('checkBootstrapParity: ok:true when ONLY .ps1 is emitted (documented asymmetric direction — only .sh implies .ps1 is required, not the reverse)', () => {
  const result = checkBootstrapParity({
    skillMd: 'Emits only scripts/worktree-bootstrap.ps1 (no .sh variant).',
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

test('checkBootstrapParity: word-boundary anchor — a similarly-named-but-different token (.shx / .ps1x) never counts as the real filename', () => {
  const result = checkBootstrapParity({
    skillMd: 'Mentions worktree-bootstrap.shx and worktree-bootstrap.ps1x as unrelated tokens — neither is the real filename.',
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

// ---------------------------------------------------------------------------
// Robustness — missing/malformed inputs are a loud-failure finding, never a
// throw and never a silent pass.
// ---------------------------------------------------------------------------

test('checkBootstrapParity: reports a loud failing finding (not a throw) when skillMd is missing (null/undefined/empty)', () => {
  for (const skillMd of [null, undefined, '']) {
    const result = checkBootstrapParity({ skillMd });
    assert.equal(result.ok, false);
    assert.equal(result.findings.length, 1);
    assert.equal(result.findings[0].file, SKILL_MD_PATH);
    assert.match(result.findings[0].message, /missing or empty input/);
  }
});
