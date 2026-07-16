#!/usr/bin/env node
// @ts-check
/**
 * One-time post-clone activator for the repo's local pre-commit gate.
 *
 * Points git's `core.hooksPath` at the tracked `.githooks/` directory for
 * this clone. `core.hooksPath` is local git config — it is NOT auto-applied
 * on clone — so a contributor must run this once (`npm install` then
 * `npm run setup-hooks`) before `git commit` starts running the validation
 * harness (`npm run validate`) as a pre-commit gate.
 *
 * Runtime: Node.js >= 18. No npm dependencies beyond `node:child_process`.
 */

import { spawnSync } from 'node:child_process';

function die(code, msg) {
  process.stderr.write(msg + '\n');
  process.exit(code);
}

function main() {
  const result = spawnSync('git', ['config', 'core.hooksPath', '.githooks'], {
    encoding: 'utf-8',
    shell: false,
  });

  if (result.error) {
    die(1, `setup-hooks: could not run "git" (${result.error.code || result.error.message})`);
  }

  if (result.status !== 0) {
    const tail = `${result.stdout || ''}${result.stderr || ''}`.trim();
    die(1, `setup-hooks: "git config core.hooksPath .githooks" exited ${result.status}: ${tail}`);
  }

  process.stdout.write('git core.hooksPath set to .githooks — pre-commit validation gate active for this clone\n');
}

main();
