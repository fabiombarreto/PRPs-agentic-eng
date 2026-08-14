#!/usr/bin/env node
// @ts-check
/**
 * Check L — plugin-root resolvability: closes the two blind spots
 * `path-existence.mjs` structurally cannot cover (see that module's own
 * header comment) now that the eight plugin-owned resource templates live
 * under `plugins/relay/resources/` (resource-packaging migration,
 * `PRPs/reports/plugin-root-audit/`):
 *
 *   R1  Any of the eight resource basenames (`prd-template.md`,
 *       `plan-template.md`, `design-spec-template.md`,
 *       `component-map-template.md`, `redaction-policy.md`,
 *       `settings-allowlist.md`, `test-output-schema.md`,
 *       `mock-sentinels.md`) appearing anywhere under `plugins/relay/`
 *       WITHOUT an immediately-preceding `${CLAUDE_PLUGIN_ROOT}/resources/`
 *       prefix — a bare or wrongly-prefixed citation of a resource this
 *       plugin packages. This is the class that was invisible to the
 *       author for five releases: this repo is simultaneously the
 *       plugin's source AND its own dogfooding target, so a bare
 *       `docs/context/<x>.md`-shaped mention resolved correctly here and
 *       nowhere else.
 *   R2  A literal `<target_root>/plugins/relay/…` path, or a
 *       `plugins/relay/…` value passed to a `--prefix` flag, appearing
 *       inside `plugins/relay/`'s own files — the
 *       H0-class defect this whole PRD started from (the Figma
 *       visual-verification tooling silently resolving to nothing in
 *       every installed instance because a script path was authored
 *       against the monorepo layout instead of `${CLAUDE_PLUGIN_ROOT}`).
 *       Deliberately scoped to these two concrete shapes rather than any
 *       backtick-quoted `plugins/relay/…` substring: this codebase's
 *       established "# SOURCE:" provenance anchors and "mirrors
 *       `plugins/relay/agents/<x>.md`" cross-file pattern citations are a
 *       large, legitimate, and growing corpus (self-referential citations
 *       between sibling files in the SAME plugin, documentary rather than
 *       runtime-resolved) — a check flagging every such mention would
 *       make `npm run validate` permanently red against correct content,
 *       exactly the kind of false positive the Phase-2 `path-existence`
 *       code review already burned a defect budget on once. `<target_root>`
 *       is never legitimately followed by `plugins/relay/` (a target
 *       project's own tree never contains that segment), and a
 *       `--prefix` flag naming `plugins/relay/…` is always the exact
 *       shape the H0 incident's `relay-design-map.md:316` carried,
 *       regardless of which command precedes the flag. The regex below
 *       is deliberately widened to match any `--prefix plugins/relay/…`
 *       invocation rather than narrowed to the literal token
 *       `npm install`: `npm ci`, `npx`, and other installers accept the
 *       identical `--prefix` flag and would carry the identical defect,
 *       so scoping detection to one installer's name would under-catch
 *       without buying meaningful precision — both sub-shapes are
 *       unambiguous regardless of surrounding prose.
 *
 * Rule R1 is anchored on backtick-quoted tokens (mirroring
 * `path-existence.mjs`'s `resolveBacktickToken`), never raw-line scanning
 * — a raw scan would flag this module's own `OWNED_RESOURCES` array (if
 * it lived under `plugins/relay/`, which it deliberately does not) and
 * would flag legitimate example/placeholder prose. Rule R2 scans raw
 * lines, because its two sub-shapes (a `<target_root>/plugins/relay/…`
 * path, a `--prefix plugins/relay/…` invocation) commonly appear inside
 * fenced shell code blocks that are never backtick-quoted inline.
 *
 * Exports:
 *   runPluginRootResolvableCheck() — walks `plugins/relay/`, applies R1 +
 *     R2, and returns `{ name, ok, findings }`, mirroring
 *     `path-existence.mjs`'s exact `{ name, ok, findings:
 *     Array<{message, file, line}> }` contract.
 *
 * Runtime: Node.js >= 18. No npm dependencies.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CHECK_NAME = 'plugin-root-resolvable';
const PLUGIN_ROOT = 'plugins/relay';
const SCANNED_EXTENSIONS = new Set(['.md', '.mjs', '.js']);
const SKIP_DIR_NAMES = new Set(['node_modules', '.git']);

// The nine resource basenames plugins/relay/resources/ packages. Any
// citation of one of these anywhere under plugins/relay/ that is not
// exactly OWNED_RESOURCE_PREFIX + basename is an R1 finding.
const OWNED_RESOURCES = [
  'prd-template.md',
  'plan-template.md',
  'design-spec-template.md',
  'component-map-template.md',
  'redaction-policy.md',
  'settings-allowlist.md',
  'test-output-schema.md',
  'mock-sentinels.md',
  'usage-metrics-schema.md',
];
const OWNED_RESOURCE_PREFIX = '${CLAUDE_PLUGIN_ROOT}/resources/';

// A backtick/link token is excluded from R1 when the text immediately
// preceding it on the same line ends with one of these example markers
// (case-insensitive) — mirrors path-existence.mjs's identical exclusion.
const EXAMPLE_MARKER_RE = /(\bfor example\b|\be\.g\.|\bexample\b)[,:]?\s*$/i;

const BACKTICK_RE = /`([^`]+)`/g;

// R2 sub-shapes: scanned as raw substrings per line, since fenced shell
// code blocks are not backtick-quoted inline.
const R2_TARGET_ROOT_LEAK_RE = /<target_root>\/plugins\/relay\//;
const R2_NPM_PREFIX_LEAK_RE = /--prefix[= ]+["']?plugins\/relay\//;

/**
 * @param {string} token
 * @returns {boolean}
 */
function isPlaceholderToken(token) {
  if (!token || token.includes(' ') || token.includes('<') || token.includes('>')) return true;
  if (token.includes('*') || token.includes('[') || token.includes(']')) return true;
  return false;
}

/**
 * @param {string} line
 * @param {number} matchIndex index of the character immediately preceding
 *   the matched token.
 * @returns {boolean}
 */
function precededByExampleMarker(line, matchIndex) {
  return EXAMPLE_MARKER_RE.test(line.slice(0, matchIndex));
}

/**
 * R1 — does this backtick token cite one of the eight owned resource
 * basenames WITHOUT the mandatory packaged prefix immediately before it?
 *
 * @param {string} token the backtick-quoted token, without the backticks
 * @returns {string | null} the offending basename, or null when the token
 *   does not cite one, or cites it with the correct prefix
 */
function findUnprefixedOwnedResource(token) {
  // Exact correct form for any of the eight basenames -> not a finding.
  for (const basename of OWNED_RESOURCES) {
    if (token === `${OWNED_RESOURCE_PREFIX}${basename}`) return null;
  }
  // Otherwise, does the token cite one of the eight basenames in any other
  // form (bare, or via any other path/prefix)? That is a finding.
  for (const basename of OWNED_RESOURCES) {
    if (token === basename || token.endsWith(`/${basename}`)) {
      return basename;
    }
  }
  return null;
}

/**
 * @param {string} dir repo-root-relative directory to walk
 * @returns {string[]} repo-root-relative file paths (posix separators)
 */
function listScannedFilesRecursive(dir) {
  const results = [];
  const absDir = resolve(dir);
  let entries;
  try {
    entries = readdirSync(absDir, { withFileTypes: true });
  } catch (err) {
    return results;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIR_NAMES.has(entry.name)) continue;
      results.push(...listScannedFilesRecursive(`${dir}/${entry.name}`));
    } else if (entry.isFile()) {
      const dotIndex = entry.name.lastIndexOf('.');
      const ext = dotIndex === -1 ? '' : entry.name.slice(dotIndex);
      if (SCANNED_EXTENSIONS.has(ext)) {
        results.push(`${dir}/${entry.name}`);
      }
    }
  }
  return results;
}

/**
 * Walks plugins/relay/, applies R1 + R2 to every file, and returns the
 * aggregated { name, ok, findings } result.
 *
 * @returns {{ name: string, ok: boolean, findings: Array<{ message: string, file: string, line: number | null }> }}
 */
export function runPluginRootResolvableCheck() {
  const findings = [];

  for (const filePath of listScannedFilesRecursive(PLUGIN_ROOT)) {
    let content;
    try {
      content = readFileSync(resolve(filePath), 'utf-8');
    } catch (err) {
      continue;
    }
    const lines = content.split(/\r?\n/);

    lines.forEach((line, idx) => {
      const lineNumber = idx + 1;

      // R1 — backtick-anchored.
      BACKTICK_RE.lastIndex = 0;
      let m;
      while ((m = BACKTICK_RE.exec(line)) !== null) {
        const token = m[1];
        if (isPlaceholderToken(token)) continue;
        if (precededByExampleMarker(line, m.index)) continue;

        const unprefixedBasename = findUnprefixedOwnedResource(token);
        if (unprefixedBasename) {
          findings.push({
            message: `resource "${unprefixedBasename}" cited as \`${token}\` — plugin-owned resources must be cited as \`${OWNED_RESOURCE_PREFIX}${unprefixedBasename}\``,
            file: filePath,
            line: lineNumber,
          });
        }
      }

      // R2 — raw-line scan for the two concrete H0-class shapes.
      if (R2_TARGET_ROOT_LEAK_RE.test(line)) {
        findings.push({
          message: 'literal "<target_root>/plugins/relay/…" path — a target project never contains a plugins/relay/ segment; use ${CLAUDE_PLUGIN_ROOT}/<subdir>/… instead',
          file: filePath,
          line: lineNumber,
        });
      }
      if (R2_NPM_PREFIX_LEAK_RE.test(line)) {
        findings.push({
          message: 'npm --prefix targeting "plugins/relay/…" — this path does not exist in the installed plugin cache; use ${CLAUDE_PLUGIN_ROOT}/<subdir>/… instead',
          file: filePath,
          line: lineNumber,
        });
      }
    });
  }

  return { name: CHECK_NAME, ok: findings.length === 0, findings };
}
