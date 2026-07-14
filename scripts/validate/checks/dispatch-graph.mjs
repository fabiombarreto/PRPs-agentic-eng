#!/usr/bin/env node
// @ts-check
/**
 * Check E — dispatch graph: every `subagent_type:`/`subagent_type=` agent
 * reference inside a `plugins/relay/commands/*.md` file must resolve to a
 * `plugins/relay/agents/<name>.md` file, and every `Next:` pointer to a
 * `/relay-x` or `/relay:relay-x` command must resolve to a
 * `plugins/relay/commands/<name>.md` file.
 *
 * Exports:
 *   checkDispatchGraph({ commandFiles, agentNames }) — pure function over
 *     already-read command file contents plus the on-disk agent-name set;
 *     returns { name, ok, findings }.
 *   runDispatchGraphCheck() — thin wrapper that lists
 *     plugins/relay/commands/*.md (reading each file's content) and
 *     plugins/relay/agents/*.md (basenames only), never plugins/prp-core/,
 *     and delegates.
 *
 * Scope: reads plugins/relay/commands/*.md bodies only (not agents/*.md
 * bodies) per this check's design — command files are the dispatch sites in
 * this repository; agent-to-agent dispatch is out of this check's scope.
 *
 * Runtime: Node.js >= 18. No npm dependencies.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';

const COMMANDS_DIR = 'plugins/relay/commands';
const AGENTS_DIR = 'plugins/relay/agents';
const CHECK_NAME = 'dispatch-graph';

// Matches `subagent_type: X`, `subagent_type="X"`, and `subagent_type='X'`
// (the two shapes observed across relay agents/commands: prose backtick
// references and literal Task(subagent_type=...) code spans).
const SUBAGENT_TYPE_RE = /subagent_type\s*[:=]\s*["']?([a-z][a-z0-9-]*(?::[a-z][a-z0-9-]*)?)["']?/g;

// Matches a `/relay-<slug>` or `/relay:relay-<slug>` command pointer on a
// line that also contains the literal token "Next:" — anchoring on both the
// "Next:" prefix and the "/relay-" prefix keeps this precise (it does not
// match unrelated `/relay-x` mentions elsewhere on other lines).
const NEXT_POINTER_RE = /\/relay(?::relay)?-([a-z0-9]+(?:-[a-z0-9]+)*)/g;

/**
 * Pure check function — no file I/O.
 *
 * @param {{ commandFiles: Array<{ path: string, content: string | null }> | null | undefined, agentNames: string[] | null | undefined }} inputs
 * @returns {{ name: string, ok: boolean, findings: Array<{ message: string, file: string, line: number | null }> }}
 */
export function checkDispatchGraph({ commandFiles, agentNames }) {
  if (!commandFiles || commandFiles.length === 0) {
    return {
      name: CHECK_NAME,
      ok: false,
      findings: [{ message: `missing or empty input: listing of ${COMMANDS_DIR}/*.md`, file: COMMANDS_DIR, line: null }],
    };
  }

  const agentSet = new Set(agentNames || []);
  const commandSet = new Set(commandFiles.map((f) => basename(f.path, '.md')));

  const findings = [];

  for (const file of commandFiles) {
    if (!file.content) {
      findings.push({ message: `could not read command file (empty content)`, file: file.path, line: null });
      continue;
    }

    const lines = file.content.split(/\r?\n/);
    lines.forEach((line, idx) => {
      const lineNumber = idx + 1;

      SUBAGENT_TYPE_RE.lastIndex = 0;
      let m;
      while ((m = SUBAGENT_TYPE_RE.exec(line)) !== null) {
        // Normalize an optional "relay:" namespace prefix on the agent name.
        const agentName = m[1].replace(/^relay:/, '');
        if (!agentSet.has(agentName)) {
          findings.push({
            message: `references subagent_type "${agentName}" but ${AGENTS_DIR}/${agentName}.md does not exist`,
            file: file.path,
            line: lineNumber,
          });
        }
      }

      if (line.includes('Next:')) {
        NEXT_POINTER_RE.lastIndex = 0;
        let nm;
        while ((nm = NEXT_POINTER_RE.exec(line)) !== null) {
          const commandName = `relay-${nm[1]}`;
          if (!commandSet.has(commandName)) {
            findings.push({
              message: `Next: pointer references "/${commandName}" but ${COMMANDS_DIR}/${commandName}.md does not exist`,
              file: file.path,
              line: lineNumber,
            });
          }
        }
      }
    });
  }

  return { name: CHECK_NAME, ok: findings.length === 0, findings };
}

/**
 * Thin wrapper — lists the real plugins/relay/commands/*.md files (reading
 * each one's content) and the real plugins/relay/agents/*.md basenames
 * (top-level only in both cases; never plugins/prp-core/), then delegates
 * to the pure function above.
 *
 * @returns {{ name: string, ok: boolean, findings: Array<{ message: string, file: string, line: number | null }> }}
 */
export function runDispatchGraphCheck() {
  const commandsDirPath = resolve(COMMANDS_DIR);
  const agentsDirPath = resolve(AGENTS_DIR);

  if (!existsSync(commandsDirPath)) {
    return {
      name: CHECK_NAME,
      ok: false,
      findings: [{ message: `missing directory: ${COMMANDS_DIR}`, file: COMMANDS_DIR, line: null }],
    };
  }

  let commandEntries;
  try {
    commandEntries = readdirSync(commandsDirPath, { withFileTypes: true });
  } catch (err) {
    return {
      name: CHECK_NAME,
      ok: false,
      findings: [{ message: `could not read ${COMMANDS_DIR}: ${err.message}`, file: COMMANDS_DIR, line: null }],
    };
  }

  const commandFiles = [];
  for (const entry of commandEntries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    const relPath = `${COMMANDS_DIR}/${entry.name}`;
    let content = null;
    try {
      content = readFileSync(resolve(relPath), 'utf-8');
    } catch (err) {
      commandFiles.push({ path: relPath, content: null });
      continue;
    }
    commandFiles.push({ path: relPath, content });
  }

  let agentNames = [];
  if (existsSync(agentsDirPath)) {
    try {
      agentNames = readdirSync(agentsDirPath, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
        .map((entry) => basename(entry.name, '.md'));
    } catch (err) {
      return {
        name: CHECK_NAME,
        ok: false,
        findings: [{ message: `could not read ${AGENTS_DIR}: ${err.message}`, file: AGENTS_DIR, line: null }],
      };
    }
  }

  return checkDispatchGraph({ commandFiles, agentNames });
}
