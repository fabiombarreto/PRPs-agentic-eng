#!/usr/bin/env node
// @ts-check
/**
 * Check C — registration parity: the shipped command set under
 * `plugins/relay/commands/` is cross-referenced against three documentation
 * surfaces — `documentation/assets/js/app.js` (the hand-authored NAV array),
 * `documentation/assets/data/search-index.json`, and
 * `documentation/changelog.html`.
 *
 * NAV is page-level (it lists documentation pages, not individual command or
 * agent names) — see `documentation/AGENTS.md` §6. Its contribution to this
 * check is therefore structural: it must reference both the commands and
 * agents reference pages. search-index.json and changelog.html DO carry
 * individual `/relay-<name>` command mentions in free text (page excerpts /
 * release notes), so those two surfaces get a full missing+stale diff
 * against the on-disk command set, anchored on the literal `/relay-` prefix
 * (a precise anchor — it does not match arbitrary prose).
 *
 * Agent names carry no comparable precise anchor in unmarked prose (unlike
 * commands, which are always written with a leading `/relay-`), so agent
 * coverage is checked in the missing direction only: every on-disk agent
 * name must appear as a whole-word substring somewhere in search-index.json
 * or changelog.html. No agent staleness (name mentioned but absent on disk)
 * check is attempted — there is no reliable anchor to harvest candidate
 * agent-name tokens from free text without false positives.
 *
 * Exports:
 *   checkRegistrationParity({ commands, agents, navHtml, searchIndexJson,
 *     changelogHtml }) — pure function over already-read inputs; returns
 *     { name, ok, findings }.
 *   runRegistrationParityCheck() — thin wrapper that lists
 *     plugins/relay/commands/*.md and plugins/relay/agents/*.md basenames
 *     (never plugins/prp-core/) and reads the three documentation surfaces,
 *     then delegates.
 *
 * Runtime: Node.js >= 18. npm dependency: node-html-parser (used to extract
 * visible text from changelog.html, so the mention-regex below runs over
 * rendered text rather than raw HTML markup/attributes).
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { parse } from 'node-html-parser';

const COMMANDS_DIR = 'plugins/relay/commands';
const AGENTS_DIR = 'plugins/relay/agents';
const NAV_PATH = 'documentation/assets/js/app.js';
const SEARCH_INDEX_PATH = 'documentation/assets/data/search-index.json';
const CHANGELOG_PATH = 'documentation/changelog.html';

const CHECK_NAME = 'registration-parity';

// Anchored on the literal "/relay-" prefix, with a negative lookbehind
// rejecting a preceding word character — this excludes path segments like
// "PRPs/prds/relay-commit-command.prd.md" or
// "cache/relay-marketplace/relay/" (the "/" there is a path separator
// preceded by another path segment, not a leading command slash) while
// still matching genuine command mentions ("`/relay-commit`",
// "the /relay-prd interactive flow", "/relay-plan → /relay-plan-review").
const COMMAND_MENTION_RE = /(?<!\w)\/relay-([a-z][a-z0-9]*(?:-[a-z0-9]+)*)/g;

/**
 * @param {string} text
 * @returns {Set<string>}
 */
function extractCommandMentions(text) {
  const mentions = new Set();
  COMMAND_MENTION_RE.lastIndex = 0;
  let m;
  while ((m = COMMAND_MENTION_RE.exec(text)) !== null) {
    mentions.add(`relay-${m[1]}`);
  }
  return mentions;
}

/**
 * @param {string[]} onDiskNames
 * @param {string} surfaceText
 * @param {string} surfacePath
 * @param {Array<{ message: string, file: string, line: number | null }>} findings
 */
function diffCommandsAgainstSurface(onDiskNames, surfaceText, surfacePath, findings) {
  const mentioned = extractCommandMentions(surfaceText);
  const onDiskSet = new Set(onDiskNames);

  for (const name of onDiskNames) {
    if (!mentioned.has(name)) {
      findings.push({
        message: `command "${name}" is registered under ${COMMANDS_DIR}/ but is not referenced (as "/${name}") in ${surfacePath}`,
        file: surfacePath,
        line: null,
      });
    }
  }
  for (const name of mentioned) {
    if (!onDiskSet.has(name)) {
      findings.push({
        message: `${surfacePath} references "/${name}" but ${COMMANDS_DIR}/${name}.md does not exist`,
        file: surfacePath,
        line: null,
      });
    }
  }
}

/**
 * @param {string[]} onDiskAgentNames
 * @param {string} surfaceText
 * @param {string} surfacePath
 * @param {Array<{ message: string, file: string, line: number | null }>} findings
 */
function diffAgentsMissingFromSurface(onDiskAgentNames, surfaceText, surfacePath, findings) {
  for (const name of onDiskAgentNames) {
    const wordBoundaryRe = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
    if (!wordBoundaryRe.test(surfaceText)) {
      findings.push({
        message: `agent "${name}" is registered under ${AGENTS_DIR}/ but is not referenced in ${surfacePath}`,
        file: surfacePath,
        line: null,
      });
    }
  }
}

/**
 * Pure check function — no file I/O. `node-html-parser`'s `parse()` call is
 * a deterministic in-memory transform of an already-read string, so it runs
 * here (mirroring how `checkVersionParity` runs `JSON.parse` internally)
 * rather than in the wrapper.
 *
 * @param {{ commands: string[] | null | undefined, agents: string[] | null | undefined, navHtml: string | null | undefined, searchIndexJson: string | null | undefined, changelogHtml: string | null | undefined }} inputs
 * @returns {{ name: string, ok: boolean, findings: Array<{ message: string, file: string, line: number | null }> }}
 */
export function checkRegistrationParity({ commands, agents, navHtml, searchIndexJson, changelogHtml }) {
  if (!commands || commands.length === 0) {
    return {
      name: CHECK_NAME,
      ok: false,
      findings: [{ message: `missing or empty input: listing of ${COMMANDS_DIR}/*.md`, file: COMMANDS_DIR, line: null }],
    };
  }

  const findings = [];
  const agentNames = agents || [];

  // Surface 1: NAV — page-level only; verify it references the commands and
  // agents landing pages (see module header for why per-name diffing does
  // not apply to this surface).
  if (!navHtml) {
    findings.push({ message: `missing or empty input: ${NAV_PATH}`, file: NAV_PATH, line: null });
  } else {
    if (!navHtml.includes('reference/commands.html')) {
      findings.push({ message: `${NAV_PATH} NAV does not reference reference/commands.html`, file: NAV_PATH, line: null });
    }
    if (!navHtml.includes('reference/agents.html')) {
      findings.push({ message: `${NAV_PATH} NAV does not reference reference/agents.html`, file: NAV_PATH, line: null });
    }
  }

  // Surface 2: search-index.json — full command diff (missing + stale) plus
  // agent missing-only diff, both anchored as described in the module header.
  if (!searchIndexJson) {
    findings.push({ message: `missing or empty input: ${SEARCH_INDEX_PATH}`, file: SEARCH_INDEX_PATH, line: null });
  } else {
    diffCommandsAgainstSurface(commands, searchIndexJson, SEARCH_INDEX_PATH, findings);
    diffAgentsMissingFromSurface(agentNames, searchIndexJson, SEARCH_INDEX_PATH, findings);
  }

  // Surface 3: changelog.html — same diff, run over the parsed visible text
  // (node-html-parser) rather than raw HTML markup, so tag attributes never
  // produce spurious mentions.
  if (!changelogHtml) {
    findings.push({ message: `missing or empty input: ${CHANGELOG_PATH}`, file: CHANGELOG_PATH, line: null });
  } else {
    const changelogText = parse(changelogHtml).text;
    diffCommandsAgainstSurface(commands, changelogText, CHANGELOG_PATH, findings);
    diffAgentsMissingFromSurface(agentNames, changelogText, CHANGELOG_PATH, findings);
  }

  return { name: CHECK_NAME, ok: findings.length === 0, findings };
}

/**
 * @param {string} dir
 * @returns {string[]}
 */
function listBasenames(dir) {
  const dirPath = resolve(dir);
  if (!existsSync(dirPath)) return [];
  return readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => basename(entry.name, '.md'));
}

/**
 * Thin wrapper — lists plugins/relay/commands/*.md and
 * plugins/relay/agents/*.md basenames (top-level only; never
 * plugins/prp-core/) and reads the three documentation surfaces, then
 * delegates to the pure function above.
 *
 * @returns {{ name: string, ok: boolean, findings: Array<{ message: string, file: string, line: number | null }> }}
 */
export function runRegistrationParityCheck() {
  const commands = listBasenames(COMMANDS_DIR);
  const agents = listBasenames(AGENTS_DIR);

  const readOrNull = (relPath) => {
    const absPath = resolve(relPath);
    if (!existsSync(absPath)) return null;
    try {
      return readFileSync(absPath, 'utf-8');
    } catch (err) {
      return null;
    }
  };

  const navHtml = readOrNull(NAV_PATH);
  const searchIndexJson = readOrNull(SEARCH_INDEX_PATH);
  const changelogHtml = readOrNull(CHANGELOG_PATH);

  return checkRegistrationParity({ commands, agents, navHtml, searchIndexJson, changelogHtml });
}
