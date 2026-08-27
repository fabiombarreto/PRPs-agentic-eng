// @ts-check
/**
 * Tests for the line-endings check.
 *
 * The check exists because `core.autocrlf` is local git config that does not
 * travel with a clone: without a root `.gitattributes`, working trees
 * diverged by platform. Two concrete things broke on 2026-08-27, both silent
 * until they weren't — `.githooks/pre-commit` and both
 * `plugins/prp-core/hooks/*.sh` checked out with a `#!/bin/bash\r` shebang
 * (fails on Unix with `bad interpreter: ^M`), and a content-invariant test
 * that sliced source with `indexOf('\n}\n')` returned -1 on a CRLF checkout,
 * collapsing the slice to a 2-character string — green on CI, red on
 * Windows, against a correct implementation. `PRPs/metrics/.gitattributes`
 * had already applied `text eol=lf` to `*.tsv` alone; that partial,
 * per-extension state is exactly what `declaresRepoWideLf` must reject.
 *
 * Same idiom as decisions-mirror.test.mjs and anti-patterns-mirror.test.mjs:
 * both polarities are exercised against the pure functions, plus the real
 * repository, because a check that only asserts its own existence tests
 * nothing. Every extracted/constructed fixture that a later assertion
 * depends on being "true" is sanity-checked first, so an accidentally
 * vacuous fixture cannot make a later comparison pass for the wrong reason.
 *
 * Run: node --test scripts/validate/checks/line-endings.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  checkLineEndings,
  declaresRepoWideLf,
  looksBinary,
  runLineEndingsCheck,
  WATCHED_FILES,
} from './line-endings.mjs';

/** @param {string} str @returns {Buffer} */
function buf(str) {
  return Buffer.from(str, 'utf8');
}

/** Build a Buffer whose every line ending is CRLF, from an LF-authored string literal. */
function crlfBuf(str) {
  return buf(str.replace(/\r?\n/g, '\r\n'));
}

const REPO_WIDE_POLICY = '* text=auto eol=lf\n*.docx binary\n';

// ---------------------------------------------------------------------------
// declaresRepoWideLf — the policy predicate, in isolation.
// ---------------------------------------------------------------------------

test('declaresRepoWideLf: true only when a `*` pattern line carries eol=lf', () => {
  assert.equal(declaresRepoWideLf(REPO_WIDE_POLICY), true);
  assert.equal(
    declaresRepoWideLf('*.tsv text eol=lf\n'),
    false,
    'a per-extension rule must not satisfy the repo-wide requirement'
  );
  assert.equal(
    declaresRepoWideLf('* text=auto\n'),
    false,
    'a `*` rule without the eol=lf token must not satisfy the requirement'
  );
  assert.equal(declaresRepoWideLf(''), false);
});

test('declaresRepoWideLf strips comments before matching, so a commented-out rule does not count', () => {
  assert.equal(
    declaresRepoWideLf('# * text=auto eol=lf\n'),
    false,
    'a fully commented-out repo-wide line must be treated as absent'
  );
  assert.equal(
    declaresRepoWideLf('* text=auto eol=lf # applies repo-wide\n'),
    true,
    'a trailing comment on an otherwise-live rule must not defeat the match'
  );
});

// ---------------------------------------------------------------------------
// looksBinary — the NUL sniff, in isolation.
// ---------------------------------------------------------------------------

test('looksBinary: true only when a NUL byte appears in the first 8000 bytes', () => {
  assert.equal(looksBinary(buf('plain text, no nulls here\n')), false);
  assert.equal(looksBinary(Buffer.from([0x00, 0x01, 0x02])), true);

  const padded = Buffer.concat([buf('x'.repeat(8000)), Buffer.from([0x00])]);
  assert.equal(
    looksBinary(padded),
    false,
    'a NUL past the first 8000 bytes must not flip the sniff — only the sniffed window counts'
  );
});

// ---------------------------------------------------------------------------
// checkLineEndings — the nine hand-verified behaviours, plus edge cases.
// ---------------------------------------------------------------------------

test('clean files under a repo-wide policy pass', () => {
  const result = checkLineEndings({
    gitattributes: REPO_WIDE_POLICY,
    files: [
      { path: 'src/foo.js', content: buf('const x = 1;\nconst y = 2;\n') },
      { path: 'README.md', content: buf('# Title\n\nBody text\n') },
    ],
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
  assert.equal(result.name, 'line-endings');
});

test('.gitattributes absent (null) fails and names why the guarantee does not travel with a clone', () => {
  const result = checkLineEndings({ gitattributes: null, files: [] });
  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /is missing/);
  assert.match(
    result.findings[0].message,
    /core\.autocrlf/,
    'the message must name the actual root cause — local core.autocrlf not traveling with a clone'
  );
});

test('a per-extension-only policy (e.g. *.tsv) does not satisfy the repo-wide requirement', () => {
  const result = checkLineEndings({ gitattributes: '*.tsv text eol=lf\n', files: [] });
  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /declares no repo-wide/);
});

test('a repo-wide rule that is commented out fails the same way as a missing repo-wide rule', () => {
  const commentedOut = '# * text=auto eol=lf\n*.docx binary\n';
  assert.equal(
    declaresRepoWideLf(commentedOut),
    false,
    'sanity: the fixture must actually read as undeclared before asserting the check rejects it'
  );
  const result = checkLineEndings({ gitattributes: commentedOut, files: [] });
  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /declares no repo-wide/);
});

test('a text file containing CRLF fails independently of the policy check', () => {
  const result = checkLineEndings({
    gitattributes: REPO_WIDE_POLICY,
    files: [{ path: 'docs/readme.md', content: crlfBuf('# Title\n\nBody text\n') }],
  });
  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1, 'the policy is fine, so only the CRLF finding fires');
  assert.match(result.findings[0].message, /1 tracked text file\(s\) carry CRLF/);
  assert.match(result.findings[0].message, /docs\/readme\.md/);
});

test('a `.sh` file with a CRLF shebang is reported as an executable-script failure, not a plain-text one', () => {
  const result = checkLineEndings({
    gitattributes: REPO_WIDE_POLICY,
    files: [{ path: 'scripts/hook.sh', content: crlfBuf('#!/bin/bash\necho hi\n') }],
  });
  assert.equal(result.ok, false);
  assert.equal(
    result.findings.length,
    1,
    'a CRLF shell script must be reported once, as a shell finding, not also counted as a plain-text finding'
  );
  assert.match(result.findings[0].message, /executable script\(s\) carry CRLF/);
  assert.match(result.findings[0].message, /bad interpreter: \^M/);
  assert.match(result.findings[0].message, /scripts\/hook\.sh/);
});

test('a shebang file with no .sh extension is still caught, by sniffing the leading bytes', () => {
  const result = checkLineEndings({
    gitattributes: REPO_WIDE_POLICY,
    files: [{ path: '.githooks/pre-commit', content: crlfBuf('#!/bin/sh\necho hi\n') }],
  });
  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /executable script\(s\) carry CRLF/);
  assert.match(result.findings[0].message, /\.githooks\/pre-commit/);
});

test('a binary (NUL-bearing) file with CRLF byte pairs is skipped, not flagged', () => {
  const binaryContent = Buffer.concat([Buffer.from([0x00]), crlfBuf('junk\r\nmore\r\n')]);
  assert.ok(
    looksBinary(binaryContent),
    'sanity: the fixture must actually sniff as binary before asserting the check skips it'
  );
  assert.ok(
    binaryContent.includes('\r\n'),
    'sanity: the fixture must actually carry CRLF before asserting it is skipped despite that'
  );
  const result = checkLineEndings({
    gitattributes: REPO_WIDE_POLICY,
    files: [{ path: 'assets/image.bin', content: binaryContent }],
  });
  assert.equal(
    result.ok,
    true,
    'a binary file must never be flagged for CRLF regardless of how many CRLF byte pairs it contains'
  );
  assert.deepEqual(result.findings, []);
});

test('shell and non-shell CRLF violations are reported as two separate findings', () => {
  const result = checkLineEndings({
    gitattributes: REPO_WIDE_POLICY,
    files: [
      { path: 'scripts/hook.sh', content: crlfBuf('#!/bin/bash\necho hi\n') },
      { path: 'docs/readme.md', content: crlfBuf('# Title\n\nBody\n') },
    ],
  });
  assert.equal(result.ok, false);
  assert.equal(
    result.findings.length,
    2,
    'shell CRLF and non-shell CRLF are different failure classes and must fire independently'
  );
  assert.match(result.findings[0].message, /executable script\(s\)/);
  assert.match(result.findings[1].message, /tracked text file\(s\)/);
});

test('a missing policy plus both CRLF classes at once produce three independent findings', () => {
  const result = checkLineEndings({
    gitattributes: null,
    files: [
      { path: 'scripts/hook.sh', content: crlfBuf('#!/bin/bash\necho hi\n') },
      { path: 'docs/readme.md', content: crlfBuf('# Title\n\nBody\n') },
    ],
  });
  assert.equal(result.ok, false);
  assert.equal(
    result.findings.length,
    3,
    'the policy finding and both CRLF-class findings must each fire independently of one another'
  );
});

test('more than 8 CRLF files are listed up to the cap, with a "+N more" suffix', () => {
  const files = Array.from({ length: 10 }, (_, i) => ({
    path: `docs/file-${i}.md`,
    content: crlfBuf(`# File ${i}\n`),
  }));
  const result = checkLineEndings({ gitattributes: REPO_WIDE_POLICY, files });
  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /10 tracked text file\(s\)/);
  assert.match(result.findings[0].message, /\+2 more/, 'the 9th and 10th paths must be summarized, not enumerated');
  assert.doesNotMatch(
    result.findings[0].message,
    /file-9\.md/,
    'a path past the MAX_LISTED cap must not be individually named'
  );
});

test('a file whose only line-ending is bare LF, and one whose content is empty, are never flagged', () => {
  const result = checkLineEndings({
    gitattributes: REPO_WIDE_POLICY,
    files: [
      { path: 'src/clean.js', content: buf('line one\nline two\n') },
      { path: 'src/empty.js', content: buf('') },
    ],
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

test('WATCHED_FILES names the .gitattributes path this check reads beyond the tracked file set', () => {
  assert.ok(WATCHED_FILES.length > 0, 'expected a non-empty watched-files list before asserting its contents');
  assert.deepEqual(WATCHED_FILES, ['.gitattributes']);
});

// ---------------------------------------------------------------------------
// The real tree.
// ---------------------------------------------------------------------------

test('the real repository is in step: a repo-wide .gitattributes policy exists and no tracked text file carries CRLF', () => {
  const result = runLineEndingsCheck();
  assert.equal(
    result.ok,
    true,
    `expected the working tree to be fully LF under a repo-wide eol=lf policy; found: ${JSON.stringify(result.findings)}`
  );
});
