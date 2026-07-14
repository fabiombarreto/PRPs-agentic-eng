#!/usr/bin/env node
// @ts-check
/**
 * On-demand behavioral-eval wrapper for `npm run eval`.
 *
 * Pre-flights `ANTHROPIC_API_KEY`: absent -> prints a clear guidance message
 * naming the variable and exits 0 (a documented, non-crashing skip — mirrors
 * scripts/validate/checks/native-validate.mjs's "dependency unavailable ->
 * skip cleanly" precedent). Present -> invokes `promptfoo eval` against the
 * repo-root `promptfooconfig.yaml` and propagates promptfoo's exit code.
 *
 * `npm run eval` is manual and non-blocking — unlike `npm run validate`, it
 * never gates a commit (LLM evals cost tokens and are non-deterministic).
 *
 * Runtime: Node.js >= 18. `promptfoo` is a devDependency — run `npm install`
 * to fetch it before invoking the with-key path. A live `ANTHROPIC_API_KEY`
 * is required only to actually run the eval; this wrapper degrades
 * gracefully without either.
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

function die(code, msg) {
  process.stderr.write(msg + '\n');
  process.exit(code);
}

/**
 * Resolves the promptfoo binary to invoke. Prefers the locally-installed
 * binary under node_modules/.bin (cross-platform, no shell needed); falls
 * back to `npx promptfoo` when the local bin is absent (e.g. before the
 * first `npm install`). Windows resolves the `.cmd` shim for both.
 *
 * @returns {{ cmd: string, args: string[] }}
 */
function resolvePromptfooInvocation() {
  const isWindows = process.platform === 'win32';
  const localBin = join('node_modules', '.bin', isWindows ? 'promptfoo.cmd' : 'promptfoo');
  if (existsSync(localBin)) {
    return { cmd: localBin, args: ['eval', '-c', 'promptfooconfig.yaml'] };
  }
  return {
    cmd: isWindows ? 'npx.cmd' : 'npx',
    args: ['promptfoo', 'eval', '-c', 'promptfooconfig.yaml'],
  };
}

function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    process.stdout.write(
      'eval skipped: ANTHROPIC_API_KEY is not set — set it to run the reviewer-agent evals ' +
        '(e.g. `export ANTHROPIC_API_KEY=...`, then re-run `npm run eval`). ' +
        'This is a clean, non-blocking skip: npm run eval is manual and never gates a commit.\n',
    );
    process.exit(0);
  }

  const { cmd, args } = resolvePromptfooInvocation();
  const result = spawnSync(cmd, args, {
    encoding: 'utf-8',
    shell: false,
    stdio: 'inherit',
  });

  if (result.error) {
    die(
      1,
      `eval: could not run "${cmd}" (${result.error.code || result.error.message}) — ` +
        'run `npm install` to fetch the `promptfoo` devDependency, then re-run `npm run eval`.',
    );
  }

  process.exit(result.status ?? 1);
}

main();
