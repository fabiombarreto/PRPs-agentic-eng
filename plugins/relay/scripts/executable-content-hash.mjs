#!/usr/bin/env node
// @ts-check
/**
 * Compute an auditable "executable content" hash of a source file at two git
 * revisions, so `code-reviewer`'s R-X guard can distinguish a test-file diff
 * that changes what a test ASSERTS from one that changes only what it SAYS.
 *
 * R-X (D17) matches at the FILE level and is deliberately content-blind: any
 * path in the canonical test-glob set appearing in `git diff --name-only`
 * fails the review. That blindness is load-bearing — it exists precisely so
 * that "my edit was harmless" can never be self-certified by the implementer.
 * This script does NOT relax it into a trust-based carve-out. It replaces the
 * self-assertion with a MECHANICAL, reproducible, third-party computation
 * whose inputs and outputs (two hashes per path) are recorded verbatim in the
 * review verdict and can be re-run by anyone against the same two revisions.
 *
 * What counts as NON-executable content (removed before hashing):
 *   - comments (line and block, per language)
 *   - Python docstrings (a string literal standing alone as a statement)
 *   - test-title string literals: a plain (non-template) string literal in the
 *     FIRST argument position of a `describe` / `it` / `test` / `context` /
 *     `suite` call, including `.only` / `.skip` / `.each` / … modifier chains
 *
 * Everything else is preserved byte-for-byte, including every other string
 * literal. `expect(x).toBe("A")` -> `toBe("B")` is an executable-content
 * change and will NOT clear. `it.skip(...)` differs from `it(...)` in the
 * callee, which is code, so adding a skip marker will NOT clear either.
 *
 * FAIL-CLOSED is the governing rule. A path is reported `cleared: false`
 * whenever anything is less than certain: unsupported extension, file absent
 * on either side, unterminated string/comment, or a `/` in JavaScript whose
 * regex-vs-division reading is ambiguous. A caller must treat every
 * non-cleared path as a plain R-X match.
 *
 * Usage:
 *   node executable-content-hash.mjs --base <rev> --head <rev|WORKTREE> \
 *        [--repo <dir>] [--pretty] -- <path> [<path> ...]
 *
 * Output: one JSON report on stdout (see REPORT_VERSION below for the shape).
 * Exit 0 when a report was produced — INCLUDING when every path was flagged;
 * the verdict lives in the report, not in the exit code. Exit 2 on a usage or
 * internal error, with a message on stderr and no report.
 *
 * Runtime: Node.js >= 18. No npm dependencies.
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { pathToFileURL } from 'node:url';

const REPORT_VERSION = 1;

/**
 * Supported languages, keyed by lowercase file extension.
 *
 * Deliberately narrow. An extension that is not listed is reported
 * `supported: false` and never cleared — adding a language is a bounded,
 * test-covered change, and its absence costs nothing but an arbitration
 * round that already exists today.
 */
const LANGUAGES = {
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.ts': 'javascript',
  '.tsx': 'javascript',
  '.mts': 'javascript',
  '.cts': 'javascript',
  '.py': 'python',
};

/** Call heads whose first plain-string argument is a test title, not data. */
const TITLE_CALLEES = new Set([
  'describe',
  'context',
  'suite',
  'it',
  'test',
  'xdescribe',
  'xcontext',
  'xit',
  'xtest',
  'fdescribe',
  'fit',
  'ftest',
]);

/** Keywords after which a `/` unambiguously opens a regex literal. */
const REGEX_PRECEDING_KEYWORDS = new Set([
  'return',
  'typeof',
  'instanceof',
  'in',
  'of',
  'new',
  'delete',
  'void',
  'throw',
  'case',
  'do',
  'else',
  'yield',
  'await',
]);

/**
 * Punctuation pairs that would become a DIFFERENT token if the whitespace
 * between them were dropped. Only these get a re-inserted separator; every
 * other punctuation pair is glued back together, which is what makes the
 * normalized form independent of the source formatting.
 */
const GLUING_PAIRS = new Set([
  '++',
  '--',
  '**',
  '<<',
  '>>',
  '&&',
  '||',
  '??',
  '=>',
  '==',
  '!=',
  '<=',
  '>=',
  '+=',
  '-=',
  '*=',
  '/=',
  '%=',
  '&=',
  '^=',
  '|=',
  '?.',
  '//',
  '/*',
  '*/',
  '::',
  '..',
]);

class AmbiguousSource extends Error {}

// ---------------------------------------------------------------------------
// JavaScript / TypeScript
// ---------------------------------------------------------------------------

/**
 * Strip comments and test-title strings from JS/TS source.
 *
 * Throws AmbiguousSource on anything the scanner cannot read with certainty.
 * @param {string} src
 * @returns {string}
 */
function normalizeJavaScript(src) {
  /** @type {string[]} */
  const out = [];
  // The code characters emitted so far, used to decide regex-vs-division and
  // to recognise a `describe(` / `it(` call head. Kept as a string because the
  // lookback needed is only a few characters plus one identifier.
  let code = '';

  // Whitespace is not executable content, so it is dropped entirely and a
  // single separator is re-inserted ONLY where two adjacent tokens would
  // otherwise glue together. The rule reads the emitted token stream, never
  // the original spacing, so the result is fully formatting-insensitive and
  // still never merges two tokens into one.
  let pendingSeparator = false;
  let sawBoundary = false;

  const isWordChar = (ch) => /[A-Za-z0-9_$]/.test(ch);
  const needsSeparator = (a, b) => {
    if (a === '' || b === '') return false;
    // A separator is only ever re-inserted where the SOURCE had one: with no
    // boundary there is nothing that dropping whitespace could have fused.
    if (!sawBoundary) return false;
    // Two word characters that the source separated are two tokens.
    if (isWordChar(a) && isWordChar(b)) return true;
    // Two punctuation characters need the separator back only when gluing
    // them would fuse them into a DIFFERENT token (`+ +` vs `++`).
    return GLUING_PAIRS.has(a + b);
  };

  const emit = (text) => {
    if (text === '') return;
    sawBoundary = pendingSeparator;
    if (needsSeparator(code.slice(-1), text[0])) {
      out.push(' ');
      code += ' ';
    }
    pendingSeparator = false;
    out.push(text);
    code += text;
  };
  const emitSpace = () => {
    if (code.length > 0) pendingSeparator = true;
  };

  const lastCodeChar = () => (code.length > 0 ? code[code.length - 1] : '');

  /** The identifier immediately preceding the current position, if any. */
  const trailingIdentifier = () => {
    const m = /([A-Za-z_$][A-Za-z0-9_$]*)\s*$/.exec(code);
    return m ? m[1] : '';
  };

  /**
   * True when the emitted code ends with a test-title call head — an
   * identifier from TITLE_CALLEES, optional `.modifier` chain, then `(`.
   */
  const atTitleArgument = () => {
    const m = /([A-Za-z_$][A-Za-z0-9_$]*)((?:\.[A-Za-z_$][A-Za-z0-9_$]*)*)\s*\(\s*$/.exec(code);
    return m !== null && TITLE_CALLEES.has(m[1]);
  };

  const regexAllowedHere = () => {
    const prev = lastCodeChar();
    if (prev === '') return true;
    if ('([{,;:=!&|?+-*%~^<>'.includes(prev)) return true;
    if (prev === ')' || prev === ']') return false;
    if (prev === '}') throw new AmbiguousSource('`/` after `}` — regex or division cannot be decided');
    if (/[A-Za-z0-9_$]/.test(prev)) {
      return REGEX_PRECEDING_KEYWORDS.has(trailingIdentifier());
    }
    throw new AmbiguousSource(`\`/\` after unexpected character ${JSON.stringify(prev)}`);
  };

  /** Consume a quoted string starting at i; returns the end index (exclusive). */
  const scanQuoted = (i, quote) => {
    let j = i + 1;
    while (j < src.length) {
      const c = src[j];
      if (c === '\\') {
        j += 2;
        continue;
      }
      if (c === quote) return j + 1;
      if (c === '\n' && quote !== '`') {
        throw new AmbiguousSource('newline inside a non-template string literal');
      }
      j++;
    }
    throw new AmbiguousSource('unterminated string literal');
  };

  let i = 0;
  while (i < src.length) {
    const c = src[i];

    // Whitespace collapses to a single space — formatting is not executable
    // content, and the P5 preflight already normalizes it upstream.
    if (c === ' ' || c === '\t' || c === '\r' || c === '\n') {
      emitSpace();
      i++;
      continue;
    }

    // Comments.
    if (c === '/' && src[i + 1] === '/') {
      const nl = src.indexOf('\n', i);
      i = nl === -1 ? src.length : nl;
      emitSpace();
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      if (end === -1) throw new AmbiguousSource('unterminated block comment');
      i = end + 2;
      emitSpace();
      continue;
    }

    // Regex literal — only where a regex is the certain reading.
    if (c === '/') {
      if (!regexAllowedHere()) {
        emit('/');
        i++;
        continue;
      }
      let j = i + 1;
      let inClass = false;
      let closed = false;
      while (j < src.length) {
        const d = src[j];
        if (d === '\\') {
          j += 2;
          continue;
        }
        if (d === '\n') throw new AmbiguousSource('newline inside a regex literal');
        if (d === '[') inClass = true;
        else if (d === ']') inClass = false;
        else if (d === '/' && !inClass) {
          closed = true;
          j++;
          break;
        }
        j++;
      }
      if (!closed) throw new AmbiguousSource('unterminated regex literal');
      while (j < src.length && /[a-z]/.test(src[j])) j++; // flags
      emit(src.slice(i, j));
      i = j;
      continue;
    }

    // Template literal — kept verbatim, including its `${}` code. Never a
    // title (an `it.each` tagged table is data, not prose).
    if (c === '`') {
      const end = scanQuoted(i, '`');
      emit(src.slice(i, end));
      i = end;
      continue;
    }

    // Plain string literal.
    if (c === '"' || c === "'") {
      const end = scanQuoted(i, c);
      if (atTitleArgument()) {
        emit('<TITLE>');
      } else {
        emit(src.slice(i, end));
      }
      i = end;
      continue;
    }

    emit(c);
    i++;
  }

  return out.join('').trim();
}

// ---------------------------------------------------------------------------
// Python
// ---------------------------------------------------------------------------

/**
 * Strip `#` comments and standalone-statement docstrings from Python source.
 *
 * Python has no test-title strings — `def test_x` is an identifier, and it is
 * code. Indentation IS executable content in Python, so leading whitespace is
 * preserved per line rather than collapsed.
 * @param {string} src
 * @returns {string}
 */
function normalizePython(src) {
  /** @type {string[]} */
  const lines = [];
  let current = '';
  let lineStartedEmpty = true; // nothing but whitespace emitted on this line yet
  let indent = '';

  const pushLine = () => {
    const trimmedRight = current.replace(/[ \t]+$/, '');
    if (trimmedRight.trim() !== '') lines.push(trimmedRight);
    current = '';
    lineStartedEmpty = true;
    indent = '';
  };

  const scanString = (i) => {
    const triple = src.slice(i, i + 3);
    const quote = src[i];
    if (triple === '"""' || triple === "'''") {
      const end = src.indexOf(triple, i + 3);
      if (end === -1) throw new AmbiguousSource('unterminated triple-quoted string');
      return { end: end + 3, triple: true };
    }
    let j = i + 1;
    while (j < src.length) {
      const c = src[j];
      if (c === '\\') {
        j += 2;
        continue;
      }
      if (c === quote) return { end: j + 1, triple: false };
      if (c === '\n') throw new AmbiguousSource('newline inside a single-quoted string');
      j++;
    }
    throw new AmbiguousSource('unterminated string literal');
  };

  let i = 0;
  while (i < src.length) {
    const c = src[i];

    if (c === '\n') {
      pushLine();
      i++;
      continue;
    }

    if (c === ' ' || c === '\t') {
      if (lineStartedEmpty) {
        indent += c;
      } else if (!current.endsWith(' ')) {
        current += ' ';
      }
      i++;
      continue;
    }

    if (c === '#') {
      const nl = src.indexOf('\n', i);
      i = nl === -1 ? src.length : nl;
      continue;
    }

    if (c === '"' || c === "'") {
      const { end } = scanString(i);
      // A docstring is a string literal that is the whole statement: nothing
      // code-bearing before it on the line, nothing but whitespace (or a
      // comment) after it. Anything else — an argument, an assignment, a
      // dict value — is data and stays.
      const rest = src.slice(end);
      const tail = /^[ \t]*(#[^\n]*)?(\n|$)/.test(rest);
      if (lineStartedEmpty && current === '' && tail) {
        const nl = src.indexOf('\n', end);
        i = nl === -1 ? src.length : nl;
        // Drop the whole statement, indentation included.
        indent = '';
        continue;
      }
      if (lineStartedEmpty) {
        current += indent;
        lineStartedEmpty = false;
      }
      current += src.slice(i, end);
      i = end;
      continue;
    }

    if (lineStartedEmpty) {
      current += indent;
      lineStartedEmpty = false;
    }
    current += c;
    i++;
  }
  pushLine();

  return lines.join('\n');
}

/**
 * @param {string} language
 * @param {string} src
 * @returns {string}
 */
export function normalizeSource(language, src) {
  if (language === 'javascript') return normalizeJavaScript(src);
  if (language === 'python') return normalizePython(src);
  throw new AmbiguousSource(`no normalizer for language ${language}`);
}

/** @param {string} text */
export function hashNormalized(text) {
  return 'sha256:' + createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * Normalize + hash one file's content, or explain why it cannot be cleared.
 * @param {string} path
 * @param {string} src
 * @returns {{hash: string} | {error: string}}
 */
export function hashExecutableContent(path, src) {
  const language = LANGUAGES[extname(path).toLowerCase()];
  if (!language) return { error: `unsupported extension ${extname(path) || '(none)'}` };
  try {
    return { hash: hashNormalized(normalizeSource(language, src)) };
  } catch (err) {
    if (err instanceof AmbiguousSource) return { error: `ambiguous source: ${err.message}` };
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Git access
// ---------------------------------------------------------------------------

/**
 * Read a path's content at a revision. `WORKTREE` reads the file on disk.
 * Returns null when the path does not exist there.
 * @param {string} repo
 * @param {string} rev
 * @param {string} path
 * @returns {string | null}
 */
function readAtRevision(repo, rev, path) {
  if (rev === 'WORKTREE') {
    const abs = join(repo, path);
    return existsSync(abs) ? readFileSync(abs, 'utf8') : null;
  }
  try {
    return execFileSync('git', ['-C', repo, 'show', `${rev}:${path}`], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch {
    return null;
  }
}

/**
 * Build the per-path report rows.
 * @param {{repo: string, base: string, head: string, paths: string[]}} opts
 */
export function buildReport({ repo, base, head, paths }) {
  const files = paths.map((path) => {
    const language = LANGUAGES[extname(path).toLowerCase()] ?? null;
    const row = {
      path,
      language,
      supported: language !== null,
      base_present: false,
      head_present: false,
      base_hash: null,
      head_hash: null,
      cleared: false,
      reason: '',
    };

    const baseSrc = readAtRevision(repo, base, path);
    const headSrc = readAtRevision(repo, head, path);
    row.base_present = baseSrc !== null;
    row.head_present = headSrc !== null;

    if (!row.supported) {
      row.reason = `not cleared — unsupported extension ${extname(path) || '(none)'}; the carve-out is fail-closed`;
      return row;
    }
    if (baseSrc === null || headSrc === null) {
      const missing = baseSrc === null ? base : head;
      row.reason = `not cleared — path absent at ${missing} (a created or deleted test file is never comment-only)`;
      return row;
    }

    const baseHash = hashExecutableContent(path, baseSrc);
    const headHash = hashExecutableContent(path, headSrc);
    if ('error' in baseHash || 'error' in headHash) {
      const detail = 'error' in baseHash ? baseHash.error : /** @type {{error: string}} */ (headHash).error;
      row.reason = `not cleared — ${detail}; the carve-out is fail-closed`;
      return row;
    }

    row.base_hash = baseHash.hash;
    row.head_hash = headHash.hash;
    row.cleared = baseHash.hash === headHash.hash;
    row.reason = row.cleared
      ? 'cleared — executable content byte-identical after removing comments and test-title strings'
      : 'not cleared — executable content differs';
    return row;
  });

  return {
    tool: 'executable-content-hash',
    version: REPORT_VERSION,
    repo,
    base,
    head,
    files,
    summary: {
      total: files.length,
      cleared: files.filter((f) => f.cleared).length,
      flagged: files.filter((f) => !f.cleared).length,
    },
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const USAGE = `Usage: node executable-content-hash.mjs --base <rev> --head <rev|WORKTREE> [--repo <dir>] [--pretty] -- <path> [<path> ...]`;

/** @param {string[]} argv */
export function parseArgs(argv) {
  const args = { repo: process.cwd(), base: null, head: null, pretty: false, paths: [] };
  let i = 0;
  for (; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--') {
      i++;
      break;
    }
    if (a === '--pretty') args.pretty = true;
    else if (a === '--base') args.base = argv[++i];
    else if (a === '--head') args.head = argv[++i];
    else if (a === '--repo') args.repo = argv[++i];
    else if (a.startsWith('--')) throw new Error(`unknown flag ${a}\n${USAGE}`);
    else break;
  }
  args.paths = argv.slice(i).filter((p) => p !== undefined && p !== '');
  if (!args.base || !args.head) throw new Error(`--base and --head are required\n${USAGE}`);
  if (args.paths.length === 0) throw new Error(`at least one path is required\n${USAGE}`);
  return args;
}

function main(argv) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (err) {
    process.stderr.write(String(err.message) + '\n');
    process.exit(2);
  }
  const report = buildReport(args);
  process.stdout.write(JSON.stringify(report, null, args.pretty ? 2 : 0) + '\n');
  process.exit(0);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main(process.argv.slice(2));
}
