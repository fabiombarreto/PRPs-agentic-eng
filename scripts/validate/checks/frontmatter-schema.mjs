#!/usr/bin/env node
// @ts-check
/**
 * Check F — frontmatter schema: every markdown file under
 * `plugins/relay/commands/`, `plugins/relay/agents/`, and every
 * `SKILL.md` under `plugins/relay/skills/` has its YAML frontmatter
 * validated against the matching JSON Schema under
 * `scripts/validate/schemas/` via ajv. Agent frontmatter additionally gets a
 * code-level cross-check: `name` must equal the filename stem (the schema
 * alone cannot see the filename).
 *
 * Exports:
 *   checkFrontmatterSchema({ files }) — pure function over already-read,
 *     already-parsed files: each `files` entry carries `{ path, kind,
 *     frontmatter }` (frontmatter pre-extracted by the wrapper via
 *     `extractFrontmatter`, or `null` + `error` when reading/parsing
 *     failed). Validates each file's frontmatter against the ajv validator
 *     for its `kind`, applies the agent-only filename cross-check, and
 *     returns { name, ok, findings }. The three JSON Schemas are compiled
 *     once at module-import time (see `validators` below), not per call
 *     and not via this function's argument — they are this check's own
 *     versioned config, not target content that varies at runtime.
 *   runFrontmatterSchemaCheck() — thin wrapper that globs the three
 *     component directories (never plugins/prp-core/), reads each file's
 *     raw content, extracts its YAML frontmatter, and delegates.
 *
 * Runtime: Node.js >= 18. npm dependency: ajv.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import Ajv from 'ajv';

const COMMANDS_DIR = 'plugins/relay/commands';
const AGENTS_DIR = 'plugins/relay/agents';
const SKILLS_DIR = 'plugins/relay/skills';

const SCHEMA_PATHS = {
  command: 'scripts/validate/schemas/command.schema.json',
  agent: 'scripts/validate/schemas/agent.schema.json',
  skill: 'scripts/validate/schemas/skill.schema.json',
};

const CHECK_NAME = 'frontmatter-schema';

// Schemas + compiled ajv validators are loaded ONCE, at module-import time
// (synchronous, deterministic — the three schema files are versioned
// alongside this check module, not target content that varies at runtime).
// Loading is wrapped in try/catch so a missing/malformed schema file is
// captured as `schemaLoadError` instead of throwing during `import` —
// `checkFrontmatterSchema` below surfaces it as a loud finding, never a
// crash, matching the runner's "a check MUST fail loud, never crash the
// whole runner" contract (scripts/validate/index.mjs `runChecks()`).
let validators = null;
let schemaLoadError = null;
try {
  const schemas = {};
  for (const [kind, schemaPath] of Object.entries(SCHEMA_PATHS)) {
    const absPath = resolve(schemaPath);
    if (!existsSync(absPath)) {
      throw new Error(`missing schema file: ${schemaPath}`);
    }
    schemas[kind] = JSON.parse(readFileSync(absPath, 'utf-8'));
  }
  const ajv = new Ajv({ allErrors: true });
  validators = {
    command: ajv.compile(schemas.command),
    agent: ajv.compile(schemas.agent),
    skill: ajv.compile(schemas.skill),
  };
} catch (err) {
  schemaLoadError = err.message;
}

/**
 * Extracts a flat key/value frontmatter object from raw markdown content.
 * Every relay command/agent/skill frontmatter block observed in this repo is
 * a single `---` … `---` fence containing one `key: value` pair per line (no
 * multi-line YAML block scalars) — this parser intentionally covers exactly
 * that shape: plain scalars and single-line single-quoted scalars (with the
 * standard YAML `''` → `'` escape). It does not implement general YAML
 * (no nesting, no block scalars, no flow collections).
 *
 * @param {string} content
 * @returns {{ frontmatter: Record<string, string> | null, error: string | null }}
 */
function extractFrontmatter(content) {
  const lines = content.split(/\r?\n/);
  if (lines[0] == null || lines[0].trim() !== '---') {
    return { frontmatter: null, error: 'file does not start with a --- frontmatter fence' };
  }
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      end = i;
      break;
    }
  }
  if (end === -1) {
    return { frontmatter: null, error: 'no closing --- frontmatter fence found' };
  }

  const frontmatter = /** @type {Record<string, string>} */ ({});
  for (let i = 1; i < end; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_-]*):[ \t]?(.*)$/);
    if (!m) {
      return { frontmatter: null, error: `unparseable frontmatter line ${i + 1}: "${line}"` };
    }
    frontmatter[m[1]] = parseYamlScalar(m[2]);
  }
  return { frontmatter, error: null };
}

/**
 * @param {string} raw
 * @returns {string}
 */
function parseYamlScalar(raw) {
  const trimmed = raw.trim();
  if (trimmed.length >= 2 && trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/\\"/g, '"');
  }
  return trimmed;
}

/**
 * Pure check function — no file I/O of its own. Every `files` entry already
 * carries its pre-extracted `frontmatter` (parsed by the wrapper via
 * `extractFrontmatter`, or `null` + `error` when the file could not be
 * read/parsed); the compiled ajv `validators` were loaded once at
 * module-import time above. This function only validates and formats
 * findings.
 *
 * @param {{ files: Array<{ path: string, kind: 'command'|'agent'|'skill', frontmatter: Record<string, string> | null, error?: string | null }> | null | undefined }} inputs
 * @returns {{ name: string, ok: boolean, findings: Array<{ message: string, file: string, line: number | null }> }}
 */
export function checkFrontmatterSchema({ files }) {
  if (schemaLoadError) {
    return {
      name: CHECK_NAME,
      ok: false,
      findings: [{ message: `could not load frontmatter JSON Schemas: ${schemaLoadError}`, file: null, line: null }],
    };
  }
  if (!files || files.length === 0) {
    return {
      name: CHECK_NAME,
      ok: false,
      findings: [{
        message: `no frontmatter-bearing files found under ${COMMANDS_DIR}/, ${AGENTS_DIR}/, or ${SKILLS_DIR}/*/SKILL.md`,
        file: null,
        line: null,
      }],
    };
  }

  const findings = [];

  for (const file of files) {
    if (file.frontmatter == null) {
      findings.push({ message: file.error || 'could not read or parse YAML frontmatter', file: file.path, line: null });
      continue;
    }

    const validate = validators[file.kind];
    if (!validate) {
      findings.push({ message: `unknown component kind "${file.kind}"`, file: file.path, line: null });
      continue;
    }

    const valid = validate(file.frontmatter);
    if (!valid) {
      // ajv overwrites `validate.errors` on every subsequent call — copy it
      // immediately before the next file's validate() call runs.
      const errors = (validate.errors || []).slice();
      for (const err of errors) {
        const where = err.instancePath ? ` at "${err.instancePath}"` : '';
        findings.push({ message: `frontmatter schema violation${where}: ${err.message}`, file: file.path, line: null });
      }
    }

    if (file.kind === 'agent' && typeof file.frontmatter.name === 'string') {
      const stem = basename(file.path, '.md');
      if (file.frontmatter.name !== stem) {
        findings.push({
          message: `agent frontmatter "name" ("${file.frontmatter.name}") does not match filename stem ("${stem}")`,
          file: file.path,
          line: null,
        });
      }
    }
  }

  return { name: CHECK_NAME, ok: findings.length === 0, findings };
}

/**
 * @param {string} dir
 * @returns {string[]}
 */
function listMarkdownFiles(dir) {
  const dirPath = resolve(dir);
  if (!existsSync(dirPath)) return [];
  return readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => `${dir}/${entry.name}`);
}

/**
 * Reads `relPath`'s raw content and extracts its YAML frontmatter, pushing
 * a `{ path, kind, frontmatter }` entry (success) or a `{ path, kind,
 * frontmatter: null, error }` entry (read failure or parse failure — a
 * loud finding via the pure function above, never a throw) onto `files`.
 *
 * @param {Array<{ path: string, kind: 'command'|'agent'|'skill', frontmatter: Record<string, string> | null, error?: string | null }>} files
 * @param {string} relPath
 * @param {'command'|'agent'|'skill'} kind
 * @returns {void}
 */
function readAndExtractFrontmatter(files, relPath, kind) {
  let content;
  try {
    content = readFileSync(resolve(relPath), 'utf-8');
  } catch (err) {
    files.push({ path: relPath, kind, frontmatter: null, error: `could not read file: ${err.message}` });
    return;
  }
  const { frontmatter, error } = extractFrontmatter(content);
  if (error) {
    files.push({ path: relPath, kind, frontmatter: null, error: `could not parse YAML frontmatter: ${error}` });
    return;
  }
  files.push({ path: relPath, kind, frontmatter });
}

/**
 * Thin wrapper — globs the command and agent markdown files plus every
 * SKILL.md under plugins/relay/skills/ (never plugins/prp-core/), reads
 * each file's raw content, extracts its YAML frontmatter, and delegates to
 * the pure function above. Schema reading/compilation happens once at
 * module-import time (see `validators` / `schemaLoadError` above), not
 * here — this wrapper's own I/O is limited to the component markdown files.
 *
 * @returns {{ name: string, ok: boolean, findings: Array<{ message: string, file: string, line: number | null }> }}
 */
export function runFrontmatterSchemaCheck() {
  /** @type {Array<{ path: string, kind: 'command'|'agent'|'skill', frontmatter: Record<string, string> | null, error?: string | null }>} */
  const files = [];

  for (const relPath of listMarkdownFiles(COMMANDS_DIR)) readAndExtractFrontmatter(files, relPath, 'command');
  for (const relPath of listMarkdownFiles(AGENTS_DIR)) readAndExtractFrontmatter(files, relPath, 'agent');

  const skillsDirPath = resolve(SKILLS_DIR);
  if (existsSync(skillsDirPath)) {
    let skillDirs = [];
    try {
      skillDirs = readdirSync(skillsDirPath, { withFileTypes: true }).filter((e) => e.isDirectory());
    } catch (err) {
      return {
        name: CHECK_NAME,
        ok: false,
        findings: [{ message: `could not read ${SKILLS_DIR}: ${err.message}`, file: SKILLS_DIR, line: null }],
      };
    }
    for (const dirEntry of skillDirs) {
      const relPath = `${SKILLS_DIR}/${dirEntry.name}/SKILL.md`;
      readAndExtractFrontmatter(files, relPath, 'skill');
    }
  }

  return checkFrontmatterSchema({ files });
}
