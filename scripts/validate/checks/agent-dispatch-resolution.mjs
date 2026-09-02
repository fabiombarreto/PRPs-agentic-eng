#!/usr/bin/env node
// @ts-check
/**
 * Check U — agent-to-agent dispatch resolution: every `subagent_type` reference
 * inside an AGENT body must resolve to a real agent file, and any agent that
 * dispatches must declare a dispatch tool in its `tools:` frontmatter.
 *
 * This closes a gap `dispatch-graph` leaves open by design. That check's own
 * docstring scopes it to `plugins/relay/commands/*.md` bodies and states that
 * "agent-to-agent dispatch is out of this check's scope" — which is defensible
 * for commands, and which means the one edge that genuinely matters is
 * unguarded: `code-reviewer` dispatches `code-reviewer-semantic` to run the
 * R-SEM semantic layer, and nothing verifies that reference resolves or that
 * `code-reviewer` declares a tool capable of making it.
 *
 * The consequence of that gap is quiet rather than loud. A dispatch that cannot
 * be made does not usually announce itself; the parent reports the rubric rows
 * it did run, and the missing row looks like a row that passed. A check is the
 * only thing that makes the difference visible.
 *
 * What this check does NOT do is decide which tool name is correct. Six agents
 * declare `Task` and none declares `Agent`; whether that name resolves at
 * runtime is a behavioural question a static check cannot answer, and renaming a
 * declaration that may currently work would be worse than the ambiguity. So the
 * accepted set is configurable and defaults to both names: the check enforces
 * that a dispatching agent declares SOME dispatch tool, and leaves which one to
 * the experiment that can actually settle it.
 *
 * Vacuity is guarded explicitly. If the scanned agents yield ZERO dispatch
 * references, the check FAILS rather than reporting a clean pass over an empty
 * set — the same guard `lane-worktree-parity` and `lane-state-writers` carry,
 * for the same reason.
 *
 * Exports:
 *   checkAgentDispatchResolution({ agents, agentNames, dispatchToolNames }) —
 *     pure function, no file I/O. `agents` maps agent file paths to text (a
 *     null/undefined value means unreadable); `agentNames` is the set of
 *     on-disk agent basenames; `dispatchToolNames` defaults to
 *     ['Task', 'Agent']. Returns { name, ok, findings: [...] }.
 *   runAgentDispatchResolutionCheck() — thin wrapper that reads the real files.
 *
 * A missing or unreadable input is a loud validation FAILURE (a returned
 * finding), never a throw and never a silent pass.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join, basename } from 'node:path';

const CHECK_NAME = 'agent-dispatch-resolution';

const AGENTS_DIR = 'plugins/relay/agents';

/** Tool names that count as a dispatch capability. */
const DEFAULT_DISPATCH_TOOLS = ['Task', 'Agent'];

/**
 * A `subagent_type` reference in either of the two spellings relay uses:
 * `subagent_type: name` (prose/YAML) and `subagent_type="name"` (call form).
 */
const SUBAGENT_REF = /subagent_type\s*[:=]\s*["']?([a-z0-9][a-z0-9-]*)["']?/gi;

/**
 * Extract the `tools:` line from an agent's YAML frontmatter. Returns null when
 * the file declares none.
 *
 * @param {string} text
 * @returns {string | null}
 */
function frontmatterTools(text) {
  const lines = text.split(String.fromCharCode(10)).map((l) => l.replace(String.fromCharCode(13), ''));
  if (lines[0] !== undefined && lines[0].trim() !== '---') return null;
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim() === '---') break;
    const m = line.match(/^tools:\s*(.*)$/);
    if (m) return m[1];
  }
  return null;
}

/**
 * Split an agent's body from its frontmatter, so a `subagent_type` appearing in
 * the frontmatter description is not mistaken for a dispatch site.
 *
 * @param {string} text
 * @returns {string}
 */
function bodyOf(text) {
  const lines = text.split(String.fromCharCode(10));
  if (lines[0] !== undefined && lines[0].trim() === '---') {
    for (let i = 1; i < lines.length; i += 1) {
      if (lines[i].trim() === '---') return lines.slice(i + 1).join(String.fromCharCode(10));
    }
  }
  return text;
}

/**
 * Pure check function — no file I/O.
 *
 * @param {{ agents: Record<string, string | null | undefined>, agentNames: Set<string> | string[], dispatchToolNames?: string[] }} inputs
 * @returns {{ name: string, ok: boolean, findings: Array<{ message: string, file: string, line: number | null }> }}
 */
export function checkAgentDispatchResolution({ agents, agentNames, dispatchToolNames }) {
  /** @type {Array<{ message: string, file: string, line: number | null }>} */
  const findings = [];

  const names = agentNames instanceof Set ? agentNames : new Set(agentNames || []);
  const tools = dispatchToolNames && dispatchToolNames.length ? dispatchToolNames : DEFAULT_DISPATCH_TOOLS;

  let dispatchRefsSeen = 0;
  const entries = Object.entries(agents || {});

  for (const [path, text] of entries) {
    if (text === null || text === undefined) {
      findings.push({
        message: `missing or unreadable agent file: ${path}`,
        file: path,
        line: null,
      });
      continue;
    }

    const body = bodyOf(text);
    const bodyLines = body.split(String.fromCharCode(10)).map((l) => l.replace(String.fromCharCode(13), ''));
    const frontmatterLineCount = text.split(String.fromCharCode(10)).length - bodyLines.length;

    /** @type {Array<{ target: string, line: number }>} */
    const refs = [];
    bodyLines.forEach((line, index) => {
      SUBAGENT_REF.lastIndex = 0;
      let m;
      while ((m = SUBAGENT_REF.exec(line)) !== null) {
        refs.push({ target: m[1], line: index + 1 + frontmatterLineCount });
      }
    });

    if (refs.length === 0) continue;
    dispatchRefsSeen += refs.length;

    for (const { target, line } of refs) {
      if (!names.has(target)) {
        findings.push({
          message: `${path} dispatches subagent_type "${target}", which resolves to no agent file in ${AGENTS_DIR}/`,
          file: path,
          line,
        });
      }
    }

    const declared = frontmatterTools(text);
    const hasDispatchTool =
      declared !== null && tools.some((tool) => new RegExp(`\\b${tool}\\b`).test(declared));

    if (!hasDispatchTool) {
      findings.push({
        message:
          `${path} dispatches another agent but declares no dispatch tool in its frontmatter ` +
          `(declared tools: ${declared === null ? 'none' : declared.trim()}; expected one of ${tools.join(', ')})`,
        file: path,
        line: null,
      });
    }
  }

  if (dispatchRefsSeen === 0) {
    findings.push({
      message:
        `no subagent_type reference found in any scanned agent under ${AGENTS_DIR}/ — a dispatch-resolution ` +
        'check with nothing to resolve passes by vacuity; confirm the agent files are readable and still carry ' +
        'their dispatch sites',
      file: AGENTS_DIR,
      line: null,
    });
  }

  return { name: CHECK_NAME, ok: findings.length === 0, findings };
}

/**
 * Thin wrapper that reads the real files and delegates to the pure function. An
 * unreadable file is a loud validation FAILURE, never a throw and never a
 * silent pass.
 *
 * @returns {{ name: string, ok: boolean, findings: Array<{ message: string, file: string, line: number | null }> }}
 */
export function runAgentDispatchResolutionCheck() {
  const dir = resolve(AGENTS_DIR);
  if (!existsSync(dir)) {
    return {
      name: CHECK_NAME,
      ok: false,
      findings: [{ message: `missing agents directory: ${AGENTS_DIR}`, file: AGENTS_DIR, line: null }],
    };
  }

  const files = readdirSync(dir).filter((f) => f.endsWith('.md'));

  /** @type {Record<string, string | null>} */
  const agents = {};
  /** @type {Set<string>} */
  const agentNames = new Set();

  for (const f of files) {
    agentNames.add(basename(f, '.md'));
    const path = `${AGENTS_DIR}/${f}`;
    try {
      agents[path] = readFileSync(join(dir, f), 'utf-8');
    } catch {
      agents[path] = null;
    }
  }

  return checkAgentDispatchResolution({ agents, agentNames });
}
