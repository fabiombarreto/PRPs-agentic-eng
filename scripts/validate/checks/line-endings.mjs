#!/usr/bin/env node
// @ts-check
/**
 * line-endings check — keeps line endings a repository policy rather than a
 * per-developer accident.
 *
 * `core.autocrlf` is local git config: it does not travel with a clone. Without
 * a root `.gitattributes`, every working tree diverged by platform, and two
 * concrete things broke — both found on 2026-08-27, both silent until then:
 *
 *   1. Shell scripts checked out with CRLF, making the shebang `#!/bin/bash\r`.
 *      On Unix that fails with `bad interpreter: ^M`. It affected
 *      `.githooks/pre-commit` — the repo's own pre-commit gate — and both
 *      `plugins/prp-core/hooks/*.sh`.
 *   2. Content-invariant tests that slice source on a literal "\n" silently
 *      changed meaning. `relay-field-findings-2026-08.test.mjs` sliced a
 *      function body with `indexOf('\n}\n')`, which returns -1 on a CRLF
 *      checkout, collapsing the slice to a 2-character string — so the test
 *      passed on CI (LF) and failed on Windows (CRLF) against a correct
 *      implementation. That is the worst failure shape: environment-dependent,
 *      and green exactly where CI would have caught it.
 *
 * This check is the mechanical guard for the fix, mirroring how
 * `decisions-mirror` and `anti-patterns-mirror` guard their own invariants.
 * `PRPs/metrics/.gitattributes` had already applied `text eol=lf` to `*.tsv`
 * for the same reason; the root policy generalizes that precedent.
 *
 * Two things are asserted:
 *   - policy: a root `.gitattributes` exists and declares an `eol=lf` rule
 *     covering all files, so the guarantee travels with the clone.
 *   - reality: no tracked text file carries a CRLF in the working tree, with
 *     shell scripts reported separately because a CRLF shebang is not cosmetic.
 *
 * Binary files are skipped by NUL sniffing, so no extension allowlist has to be
 * maintained as the repo grows.
 *
 * Exports:
 *   checkLineEndings({ gitattributes, files }) — pure function, no I/O.
 *     `files` is a list of { path, content } where content is a Buffer.
 *   runLineEndingsCheck() — reads the real tracked files and delegates.
 *
 * Runtime: Node.js >= 18. No npm dependencies.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CHECK_NAME = 'line-endings';
const ATTRIBUTES_PATH = '.gitattributes';

/** Every file this check reads beyond the tracked set. @type {string[]} */
export const WATCHED_FILES = [ATTRIBUTES_PATH];

/** How many CRLF-bearing paths to name before truncating the finding. */
const MAX_LISTED = 8;

/**
 * True when the attributes text declares an `eol=lf` rule applying to every
 * path. A narrower rule (e.g. only `*.tsv`) does not satisfy the policy — that
 * is exactly the partial state this repo was in before the root file existed.
 * @param {string} attributes
 * @returns {boolean}
 */
export function declaresRepoWideLf(attributes) {
  return attributes
    .split(/\r?\n/)
    .map((l) => l.replace(/#.*$/, '').trim())
    .filter(Boolean)
    .some((l) => {
      const [pattern, ...rest] = l.split(/\s+/);
      return pattern === '*' && rest.some((tok) => tok === 'eol=lf');
    });
}

/** @param {Buffer} buf @returns {boolean} */
export function looksBinary(buf) {
  return buf.subarray(0, 8000).includes(0);
}

/**
 * @param {{gitattributes: string|null, files: {path: string, content: Buffer}[]}} input
 * @returns {{name: string, ok: boolean, findings: {message: string, file: string, line: number}[]}}
 */
export function checkLineEndings(input) {
  /** @type {{message: string, file: string, line: number}[]} */ const findings = [];

  if (input.gitattributes === null) {
    findings.push({
      message:
        `${ATTRIBUTES_PATH} is missing. Line endings would fall back to each developer's local `
        + '`core.autocrlf`, which does not travel with a clone — the condition that produced a '
        + '`#!/bin/bash\r` shebang and an environment-dependent test. Add `* text=auto eol=lf`.',
      file: ATTRIBUTES_PATH,
      line: 1,
    });
  } else if (!declaresRepoWideLf(input.gitattributes)) {
    findings.push({
      message:
        `${ATTRIBUTES_PATH} exists but declares no repo-wide \`eol=lf\` rule (expected a \`*\` `
        + 'pattern carrying `eol=lf`). A per-extension rule leaves every other file governed by '
        + 'local `core.autocrlf`, which is the partial state this check exists to prevent.',
      file: ATTRIBUTES_PATH,
      line: 1,
    });
  }

  const crlf = [];
  const crlfShell = [];
  for (const f of input.files) {
    if (looksBinary(f.content)) continue;
    if (!f.content.includes('\r\n')) continue;
    crlf.push(f.path);
    if (f.path.endsWith('.sh') || f.content.subarray(0, 2).equals(Buffer.from('#!'))) {
      crlfShell.push(f.path);
    }
  }

  if (crlfShell.length > 0) {
    findings.push({
      message:
        `${crlfShell.length} executable script(s) carry CRLF, so the shebang reads \`#!...\r\` and `
        + `fails on Unix with \`bad interpreter: ^M\`: ${crlfShell.slice(0, MAX_LISTED).join(', ')}`
        + `${crlfShell.length > MAX_LISTED ? `, +${crlfShell.length - MAX_LISTED} more` : ''}. `
        + 'Re-checkout with the `.gitattributes` policy applied.',
      file: crlfShell[0],
      line: 1,
    });
  }

  const nonShell = crlf.filter((p) => !crlfShell.includes(p));
  if (nonShell.length > 0) {
    findings.push({
      message:
        `${nonShell.length} tracked text file(s) carry CRLF in the working tree: `
        + `${nonShell.slice(0, MAX_LISTED).join(', ')}`
        + `${nonShell.length > MAX_LISTED ? `, +${nonShell.length - MAX_LISTED} more` : ''}. `
        + 'Any code slicing on a literal "\n" then behaves differently here than on CI.',
      file: nonShell[0],
      line: 1,
    });
  }

  return { name: CHECK_NAME, ok: findings.length === 0, findings };
}

/** @returns {{name: string, ok: boolean, findings: {message: string, file: string, line: number}[]}} */
export function runLineEndingsCheck() {
  const attributes = existsSync(resolve(ATTRIBUTES_PATH))
    ? readFileSync(resolve(ATTRIBUTES_PATH), 'utf8')
    : null;

  const listed = execFileSync('git', ['ls-files', '-z'], { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 })
    .toString('utf8')
    .split('\0')
    .filter(Boolean);

  const files = [];
  for (const path of listed) {
    try {
      files.push({ path, content: readFileSync(resolve(path)) });
    } catch {
      // A tracked path absent from the working tree is another check's concern.
    }
  }

  return checkLineEndings({ gitattributes: attributes, files });
}
