// @ts-check
/**
 * Unit tests for check Q — diff-base-form — the pure `checkDiffBaseForm`
 * function exported by scripts/validate/checks/diff-base-form.mjs.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented production
 * module. Exercises the pure function only, via in-memory fixture strings —
 * no temp files, no real file I/O, no exercise of the fs wrapper.
 *
 * Why this check exists: relay's Pillar 2 never commits, and a feature
 * worktree's HEAD never moves off its base, so `git diff <base>..HEAD`
 * compares a commit to itself and returns an EMPTY set. An empty set does not
 * fail a rubric — it makes R-S1 trivially true, R-X (the universal
 * test-modification guard) pass by vacuity, and the post-green weakening scan
 * report "no weakening found" on every run. The load-bearing tests below are
 * therefore the ones proving the check actually FIRES; a guard that cannot
 * fail is exactly the defect it was written to catch.
 *
 * Run: node --test scripts/validate/checks/diff-base-form.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { checkDiffBaseForm } from './diff-base-form.mjs';

const AGENT = 'plugins/relay/agents/code-reviewer.md';

test('checkDiffBaseForm: ok:true with no findings when every git diff uses the single-argument form', () => {
  const result = checkDiffBaseForm({
    files: {
      [AGENT]: [
        'Identify the changed-file set: run',
        '`git diff --name-only <diff_target>` (default `<diff_target>=HEAD~1`).',
        'git diff --numstat <diff_target> -- <cited-test-path>',
      ].join('\n'),
    },
  });

  assert.equal(result.name, 'diff-base-form');
  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

test('checkDiffBaseForm: fires on a placeholder two-dot range and reports the 1-indexed line', () => {
  const result = checkDiffBaseForm({
    files: { [AGENT]: 'first line\ngit diff --name-only <diff_target>..HEAD\nthird line' },
  });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].file, AGENT);
  assert.equal(result.findings[0].line, 2);
  assert.match(result.findings[0].message, /single-argument form/);
  // The offending text is quoted back so the fix is mechanical, not a hunt.
  assert.match(result.findings[0].message, /<diff_target>\.\.HEAD/);
});

test('checkDiffBaseForm: fires on a differently-named base placeholder — the rule is the shape, not one spelling', () => {
  const result = checkDiffBaseForm({
    files: { [AGENT]: 'git diff --name-status <base_branch>..HEAD -- tests/' },
  });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
});

test('checkDiffBaseForm: fires on a relative-commit base such as HEAD~1..HEAD', () => {
  const result = checkDiffBaseForm({
    files: { [AGENT]: 'the agent uses `git diff --name-only HEAD~1..HEAD` to enumerate' },
  });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
});

test('checkDiffBaseForm: spares prose that quotes the forbidden form in order to forbid it', () => {
  const result = checkDiffBaseForm({
    files: {
      [AGENT]: [
        'The two-dot form `git diff <diff_target>..HEAD` MUST NOT be used.',
        'Never write `git diff --quiet <base_commit>..HEAD` here.',
        'The single argument is deliberate — do not "restore" a `git diff <x>..HEAD` suffix.',
      ].join('\n'),
    },
  });

  assert.equal(result.ok, true, 'prohibition prose must not be flagged as a violation');
  assert.deepEqual(result.findings, []);
});

test('checkDiffBaseForm: ignores a two-dot range on a line that does not invoke git diff', () => {
  const result = checkDiffBaseForm({
    files: { [AGENT]: 'The range <base>..HEAD is discussed in the architecture notes.' },
  });

  assert.equal(result.ok, true);
});

test('checkDiffBaseForm: reports every offending line, not just the first, so one pass fixes them all', () => {
  const result = checkDiffBaseForm({
    files: {
      [AGENT]: [
        'git diff --name-only <diff_target>..HEAD',
        'unrelated prose',
        'git diff --numstat <diff_target>..HEAD -- <cited-test-path>',
      ].join('\n'),
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 2);
  assert.deepEqual(result.findings.map((f) => f.line), [1, 3]);
});

test('checkDiffBaseForm: reports offending lines across multiple files', () => {
  const other = 'plugins/relay/agents/post-green-reviewer.md';
  const result = checkDiffBaseForm({
    files: {
      [AGENT]: 'git diff --name-only <diff_target>..HEAD',
      [other]: 'git diff --name-status <base_branch>..HEAD -- tests/',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 2);
  assert.deepEqual(result.findings.map((f) => f.file).sort(), [AGENT, other].sort());
});

test('checkDiffBaseForm: fails closed on an empty file map — an empty scan cannot prove the invariant', () => {
  const result = checkDiffBaseForm({ files: {} });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /no files to scan/);
});

test('checkDiffBaseForm: fails closed when files is omitted entirely', () => {
  // @ts-expect-error — deliberately exercising the missing-input contract
  const result = checkDiffBaseForm({});

  assert.equal(result.ok, false);
  assert.match(result.findings[0].message, /no files to scan/);
});

test('checkDiffBaseForm: an unreadable file (null value) is reported as a finding rather than skipped', () => {
  const result = checkDiffBaseForm({ files: { [AGENT]: null } });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].file, AGENT);
  assert.match(result.findings[0].message, /missing or unreadable file/);
});
