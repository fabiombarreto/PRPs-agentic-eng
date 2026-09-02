// @ts-check
/**
 * Unit tests for check S — lane-worktree-parity — the pure
 * `checkLaneWorktreeParity` function exported by
 * scripts/validate/checks/lane-worktree-parity.mjs.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed production module. Exercises the pure function only, via
 * in-memory fixture strings — no temp files, no real file I/O, no exercise of
 * the `runLaneWorktreeParityCheck()` fs wrapper.
 *
 * Traceability:
 *   PRPs/prds/parallel-phase-execution.prd.md AC-4  each lane gets its own
 *                                                    worktree AND its own branch
 *   Plan AC-A4                                      a finding for a path/branch
 *                                                    slug mismatch, for zero
 *                                                    creation commands, and for
 *                                                    an unreadable source — and
 *                                                    a pass when slugs match
 *
 * The vacuity case is the one that matters most. A parity check whose input set
 * has silently emptied reports a clean pass while guarding nothing, which is the
 * exact defect this repository removed at nine sites in a single day.
 *
 * Run: node --test scripts/validate/checks/lane-worktree-parity.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { checkLaneWorktreeParity } from './lane-worktree-parity.mjs';

const SOURCE = 'plugins/relay/commands/relay-worktree.md';

const MATCHING =
  'git -C <repo_root> worktree add <repo_root>/.worktrees/<worktree_slug>/ -b feature/<worktree_slug> <resolved-base>';
const SKEWED =
  'git -C <repo_root> worktree add <repo_root>/.worktrees/<worktree_slug>/ -b feature/<feature> <resolved-base>';

test('matching path and branch slugs pass', () => {
  const result = checkLaneWorktreeParity({ sources: { [SOURCE]: MATCHING } });
  assert.equal(result.name, 'lane-worktree-parity');
  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

test('a path/branch slug mismatch is a finding naming both tokens', () => {
  const result = checkLaneWorktreeParity({ sources: { [SOURCE]: SKEWED } });
  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].file, SOURCE);
  assert.equal(result.findings[0].line, 1);
  assert.match(result.findings[0].message, /<worktree_slug>/);
  assert.match(result.findings[0].message, /<feature>/);
});

test('the one-sided edit is caught in EITHER direction', () => {
  // Branch updated, path left behind — the mirror image of SKEWED.
  const other =
    'git worktree add <repo_root>/.worktrees/<feature>/ -b feature/<worktree_slug> <base>';
  const result = checkLaneWorktreeParity({ sources: { [SOURCE]: other } });
  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
});

test('ZERO creation commands is a finding — a parity check with nothing to compare is vacuous', () => {
  const result = checkLaneWorktreeParity({
    sources: { [SOURCE]: 'This file documents worktrees in prose and shows no command.' },
  });
  assert.equal(result.ok, false);
  assert.match(result.findings[0].message, /passes by vacuity/);
});

test('an entirely empty source set is a finding for the same reason', () => {
  const result = checkLaneWorktreeParity({ sources: {} });
  assert.equal(result.ok, false);
  assert.match(result.findings[0].message, /no worktree-creation command found/);
});

test('an unreadable source is a loud finding, never a silent pass', () => {
  const result = checkLaneWorktreeParity({ sources: { [SOURCE]: null } });
  assert.equal(result.ok, false);
  // Both the unreadable source AND the resulting vacuity are reported.
  assert.ok(result.findings.some((f) => /missing or unreadable source file/.test(f.message)));
});

test('a worktree add WITHOUT -b is out of scope — it reuses an existing branch', () => {
  // The documented recovery form carries no branch slug to compare against.
  const reuse = [
    'git -C <repo_root> worktree add <repo_root>/.worktrees/<worktree_slug>/ feature/<worktree_slug>',
    MATCHING,
  ].join('\n');
  const result = checkLaneWorktreeParity({ sources: { [SOURCE]: reuse } });
  assert.equal(result.ok, true);
});

test('a line mentioning worktree add in prose only does not count as a creation command', () => {
  const result = checkLaneWorktreeParity({
    sources: { [SOURCE]: ['The command shells out to worktree add.', MATCHING].join('\n') },
  });
  assert.equal(result.ok, true);
});

test('multiple creation commands are each checked, and the good ones do not mask a bad one', () => {
  const mixed = [MATCHING, 'prose in between', SKEWED, MATCHING].join('\n');
  const result = checkLaneWorktreeParity({ sources: { [SOURCE]: mixed } });
  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].line, 3);
});

test('findings across several sources are all reported', () => {
  const result = checkLaneWorktreeParity({
    sources: { [SOURCE]: SKEWED, 'plugins/relay/commands/relay-execute.md': SKEWED },
  });
  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 2);
});

test('a blockquoted command (the failure-message echo) is still checked', () => {
  // relay-worktree.md echoes the creation command inside a `> ` blockquote; the
  // echo can drift from the real command, so it must not be skipped.
  const result = checkLaneWorktreeParity({ sources: { [SOURCE]: '> ' + SKEWED } });
  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
});

test('concrete (non-placeholder) slugs are compared the same way', () => {
  const concrete =
    'git worktree add /repo/.worktrees/my-feature-lane-2/ -b feature/my-feature-lane-2 HEAD';
  assert.equal(checkLaneWorktreeParity({ sources: { [SOURCE]: concrete } }).ok, true);

  const concreteSkew =
    'git worktree add /repo/.worktrees/my-feature-lane-2/ -b feature/my-feature HEAD';
  assert.equal(checkLaneWorktreeParity({ sources: { [SOURCE]: concreteSkew } }).ok, false);
});

test('a missing sources object does not throw', () => {
  const result = checkLaneWorktreeParity({ sources: undefined });
  assert.equal(result.ok, false);
  assert.match(result.findings[0].message, /no worktree-creation command found/);
});

test('CRLF line endings are handled — the finding carries the right line number', () => {
  const crlf = ['prose', SKEWED].join('\r\n');
  const result = checkLaneWorktreeParity({ sources: { [SOURCE]: crlf } });
  assert.equal(result.ok, false);
  assert.equal(result.findings[0].line, 2);
});
