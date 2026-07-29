#!/usr/bin/env node
// @ts-check
/**
 * Check D — referenced-path existence: a precision-first ALLOWLIST of
 * "must-resolve-in-this-repo" reference CLASSES, scanned across every
 * markdown file recursively under `plugins/relay/` and `docs/`
 * (`plugins/prp-core/` is never scanned — it is outside `plugins/relay/`
 * by construction, not one of the two scan roots). Only three reference
 * classes are checked; everything else (illustrative/placeholder example
 * paths in prose, PRPs/ artifact examples, bare `docs/…` or
 * `plugins/relay/…` mentions, and target-project/planned-tree paths that
 * relay's prompts describe emitting into OTHER projects or building later)
 * is deliberately out of scope — narrowed from an earlier broad-grep design
 * after a Phase-2 code-review false-positive defect (61 findings, ~8
 * genuine) documented in this plan's Risks section:
 *
 *   1. Backtick-quoted `scripts/<...>` references (repo-owned scripts) —
 *      EXCLUDING `scripts/worktree-bootstrap.sh` / `.ps1`, which name a
 *      script relay's prompts describe emitting into a TARGET project,
 *      never this repo; check P (bootstrap-parity) already owns that
 *      invariant.
 *   2. Backtick-quoted `${CLAUDE_PLUGIN_ROOT}/{agents,commands,skills,
 *      .claude-plugin,scripts}/<file>` references — self-referential plugin
 *      assets, resolved under `plugins/relay/`. `${CLAUDE_PLUGIN_ROOT}/hooks/…`
 *      is deliberately excluded from this class: `plugins/relay/hooks/` is a
 *      planned-but-unbuilt tree (`docs/context/architecture.md`), not a
 *      valid check-D target yet. `${CLAUDE_PLUGIN_ROOT}` always resolves to
 *      the INSTALLED PLUGIN directory, by definition — it never resolves
 *      into a target project, so "names target-project-level content" was
 *      never an accurate reason to exclude any of its sub-prefixes.
 *      `${CLAUDE_PLUGIN_ROOT}/docs/…` and `${CLAUDE_PLUGIN_ROOT}/PRPs/…`
 *      remain excluded from this class as a KNOWN DEFERRED GAP: fixing them
 *      requires first deciding whether the plugin ships `docs/`/`PRPs/` at
 *      all — a materially larger, deliberately deferred design question —
 *      not because they name target-project content.
 *   3. Intra-repo relative markdown-link targets that read as repo-root
 *      paths: `[text](docs/…md)` or `[text](documentation/…html)`.
 *
 * Every matched token is further excluded when it reads as a placeholder or
 * illustrative example rather than a real reference: tokens containing `<`,
 * `>`, `*`, `feat-x`, or `foo-bar`, or tokens whose backtick/link immediately
 * follows the words "example", "e.g.", or "for example" (case-insensitive)
 * on the same line.
 *
 * Exports:
 *   checkPathExistence({ references }) — pure function over an array of
 *     already-resolved-and-checked references (each carrying a precomputed
 *     `exists` boolean); returns { name, ok, findings }. The `exists` check
 *     itself is file-system I/O and therefore happens in the wrapper, not
 *     here — this function only filters/formats.
 *   runPathExistenceCheck() — thin wrapper that recursively walks
 *     plugins/relay/ and docs/, extracts the three allowlisted reference
 *     classes above, resolves + existsSync-checks each one, and delegates.
 *
 * Runtime: Node.js >= 18. No npm dependencies.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SCAN_ROOTS = ['plugins/relay', 'docs'];
const CHECK_NAME = 'path-existence';

// scripts/<...> prefixes that name a script relay's prompts describe
// emitting into a TARGET project (never this repo) — excluded from class 1
// so this check never fights check P (bootstrap-parity), which owns the
// worktree-bootstrap.{sh,ps1} parity invariant.
const TARGET_PROJECT_SCRIPT_PREFIXES = ['scripts/worktree-bootstrap.'];

// ${CLAUDE_PLUGIN_ROOT}/<prefix>… prefixes resolved under plugins/relay/ by
// class 2. "hooks/" is deliberately excluded — plugins/relay/hooks/ is a
// planned-but-unbuilt tree (docs/context/architecture.md), not a check-D
// target yet.
const CLAUDE_PLUGIN_ROOT_ALLOWED_PREFIXES = ['agents/', 'commands/', 'skills/', '.claude-plugin/', 'scripts/'];

// Literal substrings that mark a token as illustrative/placeholder rather
// than a real reference.
const PLACEHOLDER_SUBSTRINGS = ['feat-x', 'foo-bar'];

// A backtick/link token is excluded when the text immediately preceding it
// on the same line ends with one of these example markers (case-insensitive).
const EXAMPLE_MARKER_RE = /(\bfor example\b|\be\.g\.|\bexample\b)[,:]?\s*$/i;

const BACKTICK_RE = /`([^`]+)`/g;
const MD_LINK_RE = /\]\(((?:docs|documentation)\/[^)#]+\.(?:md|html))(?:#[^)]*)?\)/g;

/**
 * Pure check function — no file I/O. Every reference already carries its
 * precomputed `exists` boolean (set by the wrapper via existsSync); this
 * function only filters the non-existent ones into findings.
 *
 * @param {{ references: Array<{ raw: string, resolvedPath: string, file: string, line: number, exists: boolean }> | null | undefined }} inputs
 * @returns {{ name: string, ok: boolean, findings: Array<{ message: string, file: string, line: number | null }> }}
 */
export function checkPathExistence({ references }) {
  if (!references) {
    return {
      name: CHECK_NAME,
      ok: false,
      findings: [{ message: `missing input: reference scan of ${SCAN_ROOTS.join(', ')}`, file: null, line: null }],
    };
  }

  const findings = [];
  for (const ref of references) {
    if (!ref.exists) {
      findings.push({
        message: `dangling reference "${ref.raw}" — resolved path "${ref.resolvedPath}" does not exist on disk`,
        file: ref.file,
        line: ref.line,
      });
    }
  }

  return { name: CHECK_NAME, ok: findings.length === 0, findings };
}

// A trailing ":<line>" or ":<line>-<line>" citation suffix (e.g.
// "docs/anti-patterns.md:60-66") names a location WITHIN an existing file,
// not a separate path — stripped before existence is checked.
const LINE_CITATION_SUFFIX_RE = /:\d+(?:-\d+)?$/;

/**
 * @param {string} token
 * @returns {boolean}
 */
function isPlaceholderToken(token) {
  if (!token || token.includes(' ') || token.includes('<') || token.includes('>')) return true;
  if (token.includes('*') || token.includes('[') || token.includes(']')) return true;
  return PLACEHOLDER_SUBSTRINGS.some((s) => token.includes(s));
}

/**
 * @param {string} line
 * @param {number} matchIndex index of the character immediately preceding
 *   the matched token — i.e. `line.slice(0, matchIndex)` is the prose
 *   before it, used to detect "example `X`" / "e.g. `X`" phrasing.
 * @returns {boolean}
 */
function precededByExampleMarker(line, matchIndex) {
  return EXAMPLE_MARKER_RE.test(line.slice(0, matchIndex));
}

/**
 * Resolves a backtick-quoted token to a repo-root-relative path when it
 * matches one of the two allowlisted backtick classes (class 1: bare
 * `scripts/…`, excluding the target-project bootstrap scripts; class 2:
 * `${CLAUDE_PLUGIN_ROOT}/{agents,commands,skills,.claude-plugin}/…`).
 * Returns null for every other token — including bare `docs/…`, `PRPs/…`,
 * and `plugins/relay/…` references, prose, and placeholder tokens — which
 * are deliberately out of this check's scope (see the module header).
 *
 * @param {string} token
 * @returns {string | null}
 */
function resolveBacktickToken(token) {
  if (isPlaceholderToken(token)) return null;

  const stripped = token.replace(LINE_CITATION_SUFFIX_RE, '');

  if (stripped.startsWith('${CLAUDE_PLUGIN_ROOT}/')) {
    const rest = stripped.slice('${CLAUDE_PLUGIN_ROOT}/'.length);
    const matchesAllowedPrefix = CLAUDE_PLUGIN_ROOT_ALLOWED_PREFIXES.some((p) => rest.startsWith(p));
    return matchesAllowedPrefix ? `plugins/relay/${rest}` : null;
  }

  if (stripped.startsWith('scripts/')) {
    const isTargetProjectScript = TARGET_PROJECT_SCRIPT_PREFIXES.some((p) => stripped.startsWith(p));
    return isTargetProjectScript ? null : stripped;
  }

  return null;
}

/**
 * Validates a markdown-link target token against class 3: an intra-repo
 * relative link whose token already reads as a repo-root path under
 * `docs/…` (ending in `.md`) or `documentation/…` (ending in `.html`). The
 * regex that produces `token` (`MD_LINK_RE`) already enforces both the
 * prefix and the extension, so this function only rejects placeholder
 * tokens; a passing token is returned unchanged as the repo-root-relative
 * path to check.
 *
 * @param {string} token
 * @returns {string | null}
 */
function resolveMarkdownLink(token) {
  if (isPlaceholderToken(token) || token.includes('://')) return null;
  return token;
}

/**
 * @param {string} line
 * @param {string} filePath
 * @param {number} lineNumber
 * @returns {Array<{ raw: string, resolvedPath: string, file: string, line: number }>}
 */
function extractReferencesFromLine(line, filePath, lineNumber) {
  const refs = [];

  BACKTICK_RE.lastIndex = 0;
  let m;
  while ((m = BACKTICK_RE.exec(line)) !== null) {
    if (precededByExampleMarker(line, m.index)) continue;
    const resolved = resolveBacktickToken(m[1]);
    if (resolved) refs.push({ raw: m[1], resolvedPath: resolved, file: filePath, line: lineNumber });
  }

  MD_LINK_RE.lastIndex = 0;
  while ((m = MD_LINK_RE.exec(line)) !== null) {
    if (precededByExampleMarker(line, m.index)) continue;
    const resolved = resolveMarkdownLink(m[1]);
    if (resolved) refs.push({ raw: m[1], resolvedPath: resolved, file: filePath, line: lineNumber });
  }

  return refs;
}

/**
 * Recursively lists every `.md` file under `dir` (repo-root-relative, posix
 * separators throughout).
 *
 * @param {string} dir
 * @returns {string[]}
 */
function listMarkdownFilesRecursive(dir) {
  const results = [];
  const absDir = resolve(dir);
  if (!existsSync(absDir)) return results;

  let entries;
  try {
    entries = readdirSync(absDir, { withFileTypes: true });
  } catch (err) {
    return results;
  }

  for (const entry of entries) {
    const relPath = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      results.push(...listMarkdownFilesRecursive(relPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(relPath);
    }
  }
  return results;
}

/**
 * Thin wrapper — recursively walks plugins/relay/ and docs/ (never
 * plugins/prp-core/, which is outside plugins/relay/ and is not one of the
 * two scan roots), extracts precisely-anchored references, existsSync-checks
 * each one, and delegates to the pure function above.
 *
 * @returns {{ name: string, ok: boolean, findings: Array<{ message: string, file: string, line: number | null }> }}
 */
export function runPathExistenceCheck() {
  const references = [];

  for (const root of SCAN_ROOTS) {
    for (const filePath of listMarkdownFilesRecursive(root)) {
      let content;
      try {
        content = readFileSync(resolve(filePath), 'utf-8');
      } catch (err) {
        continue;
      }
      const lines = content.split(/\r?\n/);
      lines.forEach((line, idx) => {
        for (const ref of extractReferencesFromLine(line, filePath, idx + 1)) {
          references.push({ ...ref, exists: existsSync(resolve(ref.resolvedPath)) });
        }
      });
    }
  }

  return checkPathExistence({ references });
}
