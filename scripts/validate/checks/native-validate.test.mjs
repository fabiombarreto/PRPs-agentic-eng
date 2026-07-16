// @ts-check
/**
 * Unit tests for check A — native-validate — the `runNativeValidateCheck`
 * function exported by scripts/validate/checks/native-validate.mjs.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed production module.
 *
 * Check A has no pure/wrapper split — it is inherently I/O (it shells out to
 * the `claude` CLI via `node:child_process.spawnSync`), and its production
 * source imports `spawnSync` as a NAMED import from the built-in
 * `node:child_process` module. Three earlier drafts of this test file were
 * each verified (by actually running the suite) to fail to deterministically
 * control what spawnSync observes:
 *   1. Mutating `spawnSync` on the object returned by
 *      `import childProcess from 'node:child_process'` is NOT visible to
 *      native-validate.mjs's own `import { spawnSync } from ...` binding in
 *      this Node version — the real `claude` CLI got invoked for real.
 *   2. PREPENDING a directory containing a fake `claude.cmd` to
 *      `process.env.PATH` (keeping the rest of PATH intact) still resolved
 *      to the real, globally-installed `claude` — Windows executable
 *      resolution for an extension-less command appears to be
 *      PATHEXT-extension-major (every PATH directory is tried for a higher-
 *      priority extension before `.CMD` is tried anywhere), not
 *      directory-major, so a `.cmd` stand-in could not outrank a same-name
 *      higher-priority-extension match living anywhere else on the original
 *      PATH.
 *   3. Fully REPLACING PATH with a directory containing only a `claude.cmd`
 *      wrapper (`cmd.exe /c` invoked implicitly by libuv for `.cmd` files)
 *      resolved correctly, but exit-code/stdio propagation through that
 *      implicit `cmd.exe` layer was unreliable for non-trivial cases (a
 *      configured non-zero exit code was not observed by spawnSync).
 *
 * What DOES work, confirmed empirically: fully replacing `process.env.PATH`
 * with a directory containing a REAL, directly-invokable Win32 executable
 * named `claude.exe` — no `cmd.exe`/batch layer at all. That executable is
 * simply a byte-for-byte copy of the currently-running `node.exe`
 * (`process.execPath`), and `NODE_OPTIONS=--require <preload>` (inherited by
 * the child the same way `process.env.PATH` is) makes that copied Node
 * binary run a small fixture script BEFORE it would otherwise try to
 * interpret the forwarded `plugin validate ./plugins/relay --strict`
 * arguments as an entry-point module — the fixture reads its behavior from
 * env vars and calls `process.exit()` itself, so real Node argv-as-script
 * resolution is never reached. This exercises the REAL spawnSync code path
 * end-to-end (a genuine subprocess, genuine exit code, genuine stdio) while
 * remaining fully deterministic and hermetic. Since native-validate.mjs has
 * no dependency-injection seam and modifying it is forbidden (B7 authors
 * tests only, never production code), this is what every test below uses.
 * The actual, globally-installed `claude` CLI is never invoked by these
 * tests.
 *
 * Traceability:
 *   PRPs/prds/validation-suite.prd.md AC-9  native validator wrap (check A)
 *   PRPs/prds/validation-suite.prd.md AC-10 scope excludes prp-core
 *
 * Run: node --test scripts/validate/checks/native-validate.test.mjs
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, copyFileSync, chmodSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { platform, execPath } from 'node:process';

import { runNativeValidateCheck } from './native-validate.mjs';

/** @type {string} */
let fakeBinDir;
/** @type {string} */
let preloadPath;

// Test fixture stand-in for the "claude" CLI — never the real CLI. Reads its
// behavior entirely from env vars so a single script serves every scenario
// below. `process.argv.slice(1)` (not `slice(2)`) because on Windows this
// runs as a `--require`'d preload BEFORE Node would otherwise treat argv[1]
// ("plugin") as an entry-point path — there is no script-path slot to skip.
// On POSIX it runs as the entry script itself via the shebang, where argv is
// [execPath, scriptPath, ...args] as usual, so `slice(2)` is used there.
//
// `basenameFirstArg` (win32 only): verified empirically that even though we
// exit before Node would try to LOAD argv[1] as a module, Node's bootstrap
// still NORMALIZES argv[1] to an absolute path relative to cwd before our
// `--require` hook ever runs (e.g. the literal arg "plugin" arrives here as
// "<cwd>\plugin") — argv[2] onward are passed through untouched. Recovering
// the original bare token via `path.basename()` on argv[1] only is a
// faithful, minimal correction for that one Node bootstrap quirk, not a
// production-code workaround.
function fixtureSource({ argvSliceIndex, basenameFirstArg }) {
  return `#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const stdout = process.env.FAKE_CLAUDE_STDOUT || '';
const stderr = process.env.FAKE_CLAUDE_STDERR || '';
const exitCode = process.env.FAKE_CLAUDE_EXIT_CODE != null ? Number(process.env.FAKE_CLAUDE_EXIT_CODE) : 0;
const argsFile = process.env.FAKE_CLAUDE_ARGS_FILE;
if (argsFile) {
  let args = process.argv.slice(${argvSliceIndex});
  ${basenameFirstArg ? 'if (args.length > 0) { args = [path.basename(args[0]), ...args.slice(1)]; }' : ''}
  fs.writeFileSync(argsFile, JSON.stringify(args));
}
if (stdout) process.stdout.write(stdout);
if (stderr) process.stderr.write(stderr);
process.exit(exitCode);
`;
}

before(() => {
  fakeBinDir = mkdtempSync(join(tmpdir(), 'relay-fake-claude-'));

  if (platform === 'win32') {
    // A real, directly-invokable PE executable — a byte-for-byte copy of
    // the currently-running node.exe — so spawnSync resolves and runs it
    // with NO cmd.exe/batch layer involved at all.
    const exePath = join(fakeBinDir, 'claude.exe');
    copyFileSync(execPath, exePath);

    preloadPath = join(fakeBinDir, 'preload.cjs');
    writeFileSync(preloadPath, fixtureSource({ argvSliceIndex: 1, basenameFirstArg: true }));
  } else {
    // POSIX stand-in: a shebang'd, directly-executable script named "claude".
    const posixPath = join(fakeBinDir, 'claude');
    writeFileSync(posixPath, fixtureSource({ argvSliceIndex: 2, basenameFirstArg: false }));
    chmodSync(posixPath, 0o755);
  }
});

after(() => {
  rmSync(fakeBinDir, { recursive: true, force: true });
});

/**
 * Runs `runNativeValidateCheck()` with `process.env.PATH` FULLY REPLACED
 * (not prepended — see the header comment for why prepending was not
 * sufficient) by `fakeBinDir` alone, `NODE_OPTIONS` pointed at the preload
 * fixture (Windows only — see `before()`), and the given fake-claude env
 * vars set, for the duration of the call only (all restored in `finally`).
 *
 * @param {{ exitCode?: number, stdout?: string, stderr?: string, argsFile?: string }} config
 */
function runWithFakeClaude({ exitCode = 0, stdout = '', stderr = '', argsFile = '' } = {}) {
  const keys = /** @type {const} */ (['FAKE_CLAUDE_EXIT_CODE', 'FAKE_CLAUDE_STDOUT', 'FAKE_CLAUDE_STDERR', 'FAKE_CLAUDE_ARGS_FILE', 'NODE_OPTIONS']);
  const savedEnv = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  const savedPath = process.env.PATH;

  process.env.FAKE_CLAUDE_EXIT_CODE = String(exitCode);
  process.env.FAKE_CLAUDE_STDOUT = stdout;
  process.env.FAKE_CLAUDE_STDERR = stderr;
  process.env.FAKE_CLAUDE_ARGS_FILE = argsFile;
  process.env.PATH = fakeBinDir;
  if (platform === 'win32') {
    // NODE_OPTIONS is parsed shell-style; a raw Windows backslash path fed
    // through that parser has its backslashes silently swallowed as escape
    // characters (verified: "C:\Users\..." arrived at Node's module
    // resolver as "C:Users..."). Forward slashes are accepted by both
    // Windows path APIs and Node's module resolution, so use those instead.
    process.env.NODE_OPTIONS = `--require "${preloadPath.split('\\').join('/')}"`;
  }

  try {
    return runNativeValidateCheck();
  } finally {
    process.env.PATH = savedPath;
    for (const k of keys) {
      if (savedEnv[k] === undefined) delete process.env[k];
      else process.env[k] = savedEnv[k];
    }
  }
}

// ---------------------------------------------------------------------------
// PRPs/prds/validation-suite.prd.md AC-9 — native validator wrap
// ---------------------------------------------------------------------------

test('runNativeValidateCheck: ok:true with no findings when claude plugin validate exits 0', () => {
  const result = runWithFakeClaude({ exitCode: 0 });

  assert.equal(result.name, 'native-validate');
  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
});

test('runNativeValidateCheck: surfaces a non-zero exit as a finding naming the exit code and the trimmed stdout+stderr tail', () => {
  const result = runWithFakeClaude({ exitCode: 1, stdout: 'some warning\n', stderr: 'FATAL: bad frontmatter\n' });

  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 1);
  assert.match(result.findings[0].message, /exited 1/);
  assert.match(result.findings[0].message, /FATAL: bad frontmatter/);
  assert.equal(result.findings[0].file, './plugins/relay');
});

test('runNativeValidateCheck: degrades gracefully (ok:true, no findings, note set) when the "claude" CLI cannot be found on PATH (ENOENT)', () => {
  // No fake-claude fixture needed here — the natural way to observe ENOENT
  // is to point PATH at a directory that resolves nothing named "claude" at
  // all (the same full-replacement technique `runWithFakeClaude` uses, just
  // aimed at an intentionally-empty directory instead of the fixture).
  const emptyDir = mkdtempSync(join(tmpdir(), 'relay-empty-path-'));
  const savedPath = process.env.PATH;
  process.env.PATH = emptyDir;
  try {
    const result = runNativeValidateCheck();
    assert.equal(result.ok, true);
    assert.deepEqual(result.findings, []);
    assert.match(result.note, /skipped/i);
  } finally {
    process.env.PATH = savedPath;
    rmSync(emptyDir, { recursive: true, force: true });
  }
});

test('runNativeValidateCheck: truncates a very long combined stdout+stderr tail to the last MAX_TAIL_CHARS characters', () => {
  const longOutput = 'A'.repeat(3000) + 'END_MARKER';
  const result = runWithFakeClaude({ exitCode: 1, stdout: longOutput });

  assert.equal(result.ok, false);
  assert.match(result.findings[0].message, /END_MARKER/);
  assert.ok(result.findings[0].message.length < longOutput.length, 'the finding message must be truncated, never the full 3000+ char output');
});

// ---------------------------------------------------------------------------
// PRPs/prds/validation-suite.prd.md AC-10 — scope excludes prp-core: check A
// invokes the native validator scoped to "./plugins/relay" only.
// ---------------------------------------------------------------------------

test('runNativeValidateCheck: invokes the native validator scoped to "./plugins/relay", never plugins/prp-core', () => {
  const argsFile = join(fakeBinDir, `args-${Date.now()}.json`);
  runWithFakeClaude({ exitCode: 0, argsFile });

  const capturedArgs = JSON.parse(readFileSync(argsFile, 'utf-8'));
  assert.deepEqual(capturedArgs, ['plugin', 'validate', './plugins/relay', '--strict']);
  assert.ok(!capturedArgs.some((/** @type {string} */ a) => a.includes('prp-core')));
});
