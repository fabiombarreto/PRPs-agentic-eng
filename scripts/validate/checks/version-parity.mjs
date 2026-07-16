#!/usr/bin/env node
// @ts-check
/**
 * Check B — version parity between plugins/relay/.claude-plugin/plugin.json
 * and the latest released version heading in documentation/changelog.html.
 *
 * Mechanizes the documentation/AGENTS.md §7.5 lock-step contract: every
 * minor/major changelog release cut MUST bump the plugin manifest to the
 * same version in the same commit.
 *
 * Exports:
 *   checkVersionParity({ pluginJson, changelogHtml }) — pure function over
 *     two input strings; returns { name, ok, findings: [...] }.
 *   runVersionParityCheck() — thin wrapper that reads the two real files
 *     from the repository root and delegates to the pure function.
 *
 * Scope invariant: this check reads ONLY the two named relay/doc files
 * above (plugins/relay/.claude-plugin/plugin.json and
 * documentation/changelog.html); no other plugin tree is read.
 *
 * Runtime: Node.js >= 18. No npm dependencies.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const PLUGIN_JSON_PATH = 'plugins/relay/.claude-plugin/plugin.json';
const CHANGELOG_PATH = 'documentation/changelog.html';

const CHECK_NAME = 'version-parity';

/**
 * Extract the latest released version (Y) from the changelog HTML.
 * Scans every `<h2 id="...">` heading in document order, skipping the
 * always-first `id="unreleased"` heading, and returns the version from
 * the first heading whose trimmed text begins with `\d+\.\d+\.\d+`
 * (e.g. "0.20.0 &#8212; 2026-07-12" or "0.20.0 — 2026-07-12" — whatever
 * separator follows the version is irrelevant, since only the start of
 * the trimmed text is matched). A heading whose trimmed text does not
 * begin with a version (e.g. a trailing "Format notes" heading) does not
 * stop the scan; the scan simply continues to the next `<h2>`.
 *
 * @param {string} changelogHtml
 * @returns {{ version: string | null }}
 */
function extractLatestChangelogVersion(changelogHtml) {
  const headingRe = /<h2\s+id="([^"]*)"[^>]*>([^<]*)<\/h2>/g;
  let match;
  while ((match = headingRe.exec(changelogHtml)) !== null) {
    const id = match[1];
    const text = match[2];
    if (id === 'unreleased') continue;
    const versionMatch = text.trim().match(/^\d+\.\d+\.\d+/);
    if (versionMatch) {
      return { version: versionMatch[0] };
    }
    // A non-unreleased heading whose text doesn't start with a version
    // number (e.g. a trailing "Format notes" heading) is not a release
    // heading — keep scanning for the first one that is.
  }
  return { version: null };
}

/**
 * Pure check function — no file I/O. Compares the plugin manifest version
 * (X) against the latest changelog release version (Y). A missing or
 * unparseable input is a loud validation FAILURE (a returned finding),
 * never a throw and never a silent pass.
 *
 * @param {{ pluginJson: string | null | undefined, changelogHtml: string | null | undefined }} inputs
 * @returns {{ name: string, ok: boolean, findings: Array<{ message: string, file: string, line: number | null }> }}
 */
export function checkVersionParity({ pluginJson, changelogHtml }) {
  if (!pluginJson) {
    return {
      name: CHECK_NAME,
      ok: false,
      findings: [{ message: `missing or empty input: ${PLUGIN_JSON_PATH}`, file: PLUGIN_JSON_PATH, line: null }],
    };
  }
  if (!changelogHtml) {
    return {
      name: CHECK_NAME,
      ok: false,
      findings: [{ message: `missing or empty input: ${CHANGELOG_PATH}`, file: CHANGELOG_PATH, line: null }],
    };
  }

  let pluginVersion;
  try {
    const parsed = JSON.parse(pluginJson);
    pluginVersion = parsed && parsed.version;
  } catch (err) {
    return {
      name: CHECK_NAME,
      ok: false,
      findings: [{ message: `could not parse ${PLUGIN_JSON_PATH} as JSON: ${err.message}`, file: PLUGIN_JSON_PATH, line: null }],
    };
  }

  if (!pluginVersion) {
    return {
      name: CHECK_NAME,
      ok: false,
      findings: [{ message: `${PLUGIN_JSON_PATH} has no "version" field`, file: PLUGIN_JSON_PATH, line: null }],
    };
  }

  const { version: changelogVersion } = extractLatestChangelogVersion(changelogHtml);

  if (!changelogVersion) {
    return {
      name: CHECK_NAME,
      ok: false,
      findings: [{ message: `no versioned <h2> heading found in ${CHANGELOG_PATH} (only "Unreleased"?)`, file: CHANGELOG_PATH, line: null }],
    };
  }

  if (pluginVersion !== changelogVersion) {
    return {
      name: CHECK_NAME,
      ok: false,
      findings: [{
        message: `version mismatch: ${PLUGIN_JSON_PATH} declares "${pluginVersion}" but the latest ${CHANGELOG_PATH} release is "${changelogVersion}"`,
        file: PLUGIN_JSON_PATH,
        line: null,
      }],
    };
  }

  return { name: CHECK_NAME, ok: true, findings: [] };
}

/**
 * Thin wrapper — reads the two real files from the repository root
 * (resolved relative to `cwd`, which `npm run validate` guarantees is the
 * repository root) and delegates to the pure function above. A missing or
 * unreadable file is a loud validation FAILURE, never a throw and never a
 * silent pass.
 *
 * @returns {{ name: string, ok: boolean, findings: Array<{ message: string, file: string, line: number | null }> }}
 */
export function runVersionParityCheck() {
  const pluginJsonPath = resolve(PLUGIN_JSON_PATH);
  const changelogPath = resolve(CHANGELOG_PATH);

  let pluginJson = null;
  if (existsSync(pluginJsonPath)) {
    try {
      pluginJson = readFileSync(pluginJsonPath, 'utf-8');
    } catch (err) {
      return {
        name: CHECK_NAME,
        ok: false,
        findings: [{ message: `could not read ${PLUGIN_JSON_PATH}: ${err.message}`, file: PLUGIN_JSON_PATH, line: null }],
      };
    }
  }

  let changelogHtml = null;
  if (existsSync(changelogPath)) {
    try {
      changelogHtml = readFileSync(changelogPath, 'utf-8');
    } catch (err) {
      return {
        name: CHECK_NAME,
        ok: false,
        findings: [{ message: `could not read ${CHANGELOG_PATH}: ${err.message}`, file: CHANGELOG_PATH, line: null }],
      };
    }
  }

  return checkVersionParity({ pluginJson, changelogHtml });
}
