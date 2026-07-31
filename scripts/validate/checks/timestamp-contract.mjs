#!/usr/bin/env node
// @ts-check
/**
 * timestamp-contract check — mechanically enforces the `review_started_at`
 * contract shipped in v0.25.0 (commit `e0a0c17`).
 *
 * Background: `scripts/efficiency.mjs compare` classifies each artifact by
 * its first verdict's timestamp against a recorded release marker. Before
 * v0.25.0, reviewer agents with no clock (`Bash`-less) fabricated
 * `T00:00:00Z` stamps, corrupting 45% of the corpus's before/after
 * classification. v0.25.0 fixed the *behavior* — a `review_started_at`
 * input captured by eight dispatching commands, consumed by seven
 * reviewers, with a capability-matched fallback on each side — but the fix
 * is entirely prose across those 15 files. Nothing failed if a new
 * reviewer shipped without the section, if a command dropped its
 * `date -u` capture, or if a reviewer's fallback branch didn't match its
 * actual capability. This check is the mechanical gate that was missing.
 *
 * Exports:
 *   checkTimestampContract({ files, jsonlEntries, marker }) — pure
 *     function, no I/O. `files` maps each registered path to its
 *     already-read content (or null/undefined when unreadable — such
 *     entries are skipped here, already reported by the wrapper).
 *     `jsonlEntries` is an array of already-parsed jsonl verdict objects,
 *     each carrying `file` and `line` for reporting. `marker` is the
 *     `markerUtc` ISO instant from `PRPs/reports/efficiency/v0.25.0.json`,
 *     or `null` when that file is absent/unparseable.
 *   runTimestampContractCheck() — thin wrapper that reads every watched
 *     prompt file, the `PRPs/plans/*.jsonl` corpus, and the efficiency
 *     marker, then delegates.
 *
 * Registry-driven: the seven jsonl-appending reviewers and the eight
 * dispatching commands are flat arrays, appended to (never replaced) when
 * the contract grows to a new reviewer or command — mirroring
 * `feedback-chain.mjs`'s PAIRS registry precedent.
 *
 * Three deliberate registry exclusions, each carried as a comment rather
 * than a silent omission (mirroring `feedback-chain.mjs`'s `docs-updater`
 * precedent):
 *
 *   - `post-green-reviewer` — Bash-capable, but appends no jsonl verdict
 *     and has no `Write` tool. There is no append-only log for this check
 *     to watch.
 *   - `code-reviewer-semantic` — returns structured JSON to its
 *     `code-reviewer` parent via `Task`; it has no `Write` tool and
 *     appends no jsonl of its own.
 *   - `relay-execute` — adopts `/relay-plan-review` inline under D7 and
 *     inherits that command's `review_started_at` capture; requiring its
 *     own `date -u` capture would assert a contract that does not exist.
 *
 * The check gates both ends of the contract: the REVIEWERS/COMMANDS loops
 * above assert the PRODUCER half (reviewers emit `timestamp_degraded`
 * correctly); the CONSUMERS registry below asserts the CONSUMER half (a
 * registered file actually reads and honors the flag in executable code,
 * not merely documents it in a comment) — mirroring `feedback-chain.mjs`'s
 * PAIRS registry, the in-repo precedent for gating both ends of a contract
 * rather than only one. This addition closes the exact gap that shipped the
 * `timestamp_degraded` flag with a producer-only gate: `scripts/efficiency.mjs`
 * carried no consumer-side code at all in the same session that built this
 * check (see `docs/decisions.md`, dated entry recording the exclusion policy).
 *
 * Runtime: Node.js >= 18. No npm dependencies.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const CHECK_NAME = 'timestamp-contract';

/**
 * The seven jsonl-appending reviewers this contract covers. Every entry
 * both declares a `review_started_at` input and carries a
 * `### Timestamp discipline (mandatory)` section whose fallback branch
 * must match the reviewer's own capability.
 *
 * @type {string[]}
 */
const REVIEWERS = [
  'plugins/relay/agents/code-reviewer.md',
  'plugins/relay/agents/docs-reviewer.md',
  'plugins/relay/agents/test-reviewer.md',
  'plugins/relay/agents/plan-reviewer.md',
  'plugins/relay/agents/prd-reviewer.md',
  'plugins/relay/agents/design-map-reviewer.md',
  'plugins/relay/agents/design-spec-reviewer.md',
];

/**
 * The eight dispatching commands that must capture the instant with
 * `date -u +%Y-%m-%dT%H:%M:%SZ` and pass `review_started_at` through to
 * the reviewer they dispatch.
 *
 * @type {string[]}
 */
const COMMANDS = [
  'plugins/relay/commands/relay-plan-review.md',
  'plugins/relay/commands/relay-code-review.md',
  'plugins/relay/commands/relay-test-write-review.md',
  'plugins/relay/commands/relay-implement.md',
  'plugins/relay/commands/relay-prd.md',
  'plugins/relay/commands/relay-approve.md',
  'plugins/relay/commands/relay-design-map.md',
  'plugins/relay/commands/relay-design-spec.md',
];

/**
 * Every file that CONSUMES the `timestamp_degraded` flag — i.e. classifies
 * or otherwise acts on jsonl artifacts by timestamp and must therefore
 * honor the producer's placeholder-stamp declaration rather than trusting
 * it. Registered consumers are asserted to reference `timestamp_degraded`
 * in EXECUTABLE code (comments stripped first), not merely to document it.
 *
 * Deliberate exclusions, carried as a comment rather than a silent gap
 * (mirroring `feedback-chain.mjs`'s `docs-updater` precedent above):
 *
 *   - `scripts/eval.mjs` — runs promptfoo evals against golden fixtures; it
 *     never reads or classifies jsonl verdict entries by timestamp at all,
 *     so there is no timestamp behavior for this contract to gate.
 *   - `.claude/commands/efficiency-report.md` — a prose skill that shells
 *     out to `scripts/efficiency.mjs`; the classification logic itself
 *     lives entirely in the registered consumer below, so requiring the
 *     skill file to also reference the flag in "executable code" would
 *     assert a contract that does not exist for a Markdown prompt file.
 *
 * @type {string[]}
 */
const CONSUMERS = ['scripts/efficiency.mjs'];

/** Every file this check reads. @type {string[]} */
export const WATCHED_FILES = [...new Set([...REVIEWERS, ...COMMANDS, ...CONSUMERS])];

/** Slice `content` from the first line matching `startRe` up to the next line matching `endRe`. */
function slice(content, startRe, endRe) {
  const lines = content.split('\n');
  const start = lines.findIndex((l) => startRe.test(l));
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => endRe.test(l));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n');
}

/**
 * The negation trap: in every Bash-capable reviewer, the literal token
 * `timestamp_degraded` appears inside the negation "never sets
 * `timestamp_degraded`". A plain substring/occurrence count cannot
 * distinguish that from an actual instruction to SET the flag, which is
 * exactly what a clockless reviewer's section legitimately contains
 * ("... and add `"timestamp_degraded": true` ..."). This classifies each
 * mention as negated (immediately preceded by "never sets"/"never set",
 * optionally through a backtick) or a genuine SET instruction.
 *
 * @param {string | null} section
 * @returns {{ setCount: number, negatedCount: number }}
 */
function classifyDegradedMentions(section) {
  if (!section) return { setCount: 0, negatedCount: 0 };
  const NEGATION_RE = /never\s+sets?\s*`?timestamp_degraded/gi;
  const ALL_RE = /timestamp_degraded/g;

  const negatedIndices = new Set();
  let m;
  while ((m = NEGATION_RE.exec(section))) {
    const idx = section.indexOf('timestamp_degraded', m.index);
    if (idx !== -1) negatedIndices.add(idx);
  }

  let total = 0;
  while ((m = ALL_RE.exec(section))) {
    total++;
  }

  return { setCount: total - negatedIndices.size, negatedCount: negatedIndices.size };
}

/**
 * Strip `//` line comments and `/* *\/` block comments from source text, so
 * the CONSUMERS assertion below cannot be satisfied by documentation alone —
 * only a reference that survives comment-stripping counts as consuming the
 * flag in executable code.
 *
 * @param {string} content
 * @returns {string}
 */
function stripComments(content) {
  return content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

/**
 * Pure check function — no file I/O of its own.
 *
 * @param {{
 *   files: Record<string, string | null | undefined>,
 *   jsonlEntries: Array<Record<string, any>>,
 *   marker: string | null,
 * }} inputs
 * @returns {{ name: string, ok: boolean, findings: Array<{ message: string, file: string | null, line: number | null }>, notes: string[] }}
 */
export function checkTimestampContract({ files, jsonlEntries, marker }) {
  const findings = [];
  const notes = [];
  const add = (message, file, line = null) => findings.push({ message, file, line });

  // Assertions 1-4: per-reviewer prose contract.
  for (const path of REVIEWERS) {
    const content = files[path];
    if (!content) continue; // already reported by the wrapper (missing/unreadable)

    if (!content.includes('review_started_at')) {
      add('does not declare a review_started_at input', path);
    }

    const section = slice(content, /^### Timestamp discipline \(mandatory\)/, /^### /);
    if (section === null) {
      add('no "### Timestamp discipline (mandatory)" section found', path);
      continue;
    }

    if (!/T00:00:00/.test(section)) {
      add('Timestamp discipline section does not name T00:00:00 as explicitly unacceptable', path);
    }

    const toolsLine = (content.match(/^tools:.*$/m) || [''])[0];
    const hasBash = /\bBash\b/.test(toolsLine);
    const hasDateCapture = section.includes('date -u +%Y-%m-%dT%H:%M:%SZ');
    const { setCount } = classifyDegradedMentions(section);

    if (hasBash) {
      if (!hasDateCapture) {
        add(
          'Bash-capable reviewer\'s Timestamp discipline section does not instruct self-serving the instant with date -u +%Y-%m-%dT%H:%M:%SZ',
          path,
        );
      }
      if (setCount > 0) {
        add(
          'Bash-capable reviewer\'s Timestamp discipline section instructs setting timestamp_degraded, but this reviewer has Bash and must self-serve the instant instead',
          path,
        );
      }
    } else {
      if (setCount === 0) {
        add(
          'clockless reviewer\'s Timestamp discipline section does not instruct setting "timestamp_degraded": true on fallback',
          path,
        );
      }
      if (hasDateCapture) {
        add(
          'clockless reviewer\'s Timestamp discipline section instructs date -u, but this reviewer has no Bash tool to run it',
          path,
        );
      }
    }
  }

  // Assertion 5: per-command capture + pass-through.
  for (const path of COMMANDS) {
    const content = files[path];
    if (!content) continue; // already reported by the wrapper (missing/unreadable)

    if (!content.includes('date -u +%Y-%m-%dT%H:%M:%SZ')) {
      add('does not capture the instant with date -u +%Y-%m-%dT%H:%M:%SZ', path);
    }
    if (!content.includes('review_started_at')) {
      add('does not pass review_started_at through to the dispatched reviewer', path);
    }
  }

  // Assertion 6: consumer-side executable-reference check. A registered
  // consumer must reference timestamp_degraded in code that survives
  // comment-stripping — documenting the flag in a comment without
  // consuming it fails, which is exactly the gap this registry gates.
  for (const path of CONSUMERS) {
    const content = files[path];
    if (!content) continue; // already reported by the wrapper (missing/unreadable)

    if (!stripComments(content).includes('timestamp_degraded')) {
      add('registered consumer does not reference timestamp_degraded in executable code (comment-only or absent)', path);
    }
  }

  // AC-A6: real output, not only prose. Post-marker jsonl verdict entries
  // must not carry a T00:00:00 stamp without an accompanying
  // timestamp_degraded flag. Pre-marker entries are exempt by
  // construction (their real instants were never observed). An absent or
  // unparseable marker skips this assertion with a visible note rather
  // than failing or silently passing.
  if (!marker) {
    notes.push(
      'efficiency marker (PRPs/reports/efficiency/v0.25.0.json markerUtc) absent or unparseable — AC-A6 output assertion skipped',
    );
  } else {
    const markerMs = new Date(marker).getTime();
    if (Number.isNaN(markerMs)) {
      notes.push(
        `efficiency marker value "${marker}" could not be parsed as a date — AC-A6 output assertion skipped`,
      );
    } else {
      for (const entry of jsonlEntries || []) {
        if (!entry || typeof entry.timestamp !== 'string') continue;
        const entryMs = new Date(entry.timestamp).getTime();
        if (Number.isNaN(entryMs) || entryMs < markerMs) continue; // pre-marker or unparseable: exempt
        if (/T00:00:00/.test(entry.timestamp) && !entry.timestamp_degraded) {
          add(
            'post-marker jsonl verdict entry carries a T00:00:00 timestamp without an accompanying timestamp_degraded flag',
            entry.file || null,
            entry.line ?? null,
          );
        }
      }
    }
  }

  return { name: CHECK_NAME, ok: findings.length === 0, findings, notes };
}

/**
 * Thin wrapper — reads every watched prompt file, the `PRPs/plans/*.jsonl`
 * verdict corpus, and the efficiency marker, then delegates. All I/O
 * lives here so `checkTimestampContract` stays pure and testable via
 * in-memory fixtures.
 *
 * @returns {{ name: string, ok: boolean, findings: Array<{ message: string, file: string | null, line: number | null }>, notes: string[] }}
 */
export function runTimestampContractCheck() {
  /** @type {Record<string, string | null>} */
  const files = {};
  const findings = [];

  for (const path of WATCHED_FILES) {
    const abs = resolve(path);
    if (!existsSync(abs)) {
      files[path] = null;
      findings.push({ message: `missing file: ${path}`, file: path, line: null });
      continue;
    }
    try {
      files[path] = readFileSync(abs, 'utf-8');
    } catch (err) {
      files[path] = null;
      findings.push({ message: `could not read ${path}: ${err.message}`, file: path, line: null });
    }
  }

  // The jsonl verdict corpus. Deliberately flat (`PRPs/plans/*.jsonl`),
  // never recursive into `PRPs/plans/completed/` — mirrors the plan's own
  // "scan PRPs/plans/*.jsonl" scope.
  /** @type {Array<Record<string, any>>} */
  const jsonlEntries = [];
  const plansDir = resolve('PRPs/plans');
  let jsonlFiles = [];
  try {
    jsonlFiles = readdirSync(plansDir).filter((f) => f.endsWith('.jsonl'));
  } catch {
    jsonlFiles = [];
  }
  for (const fname of jsonlFiles) {
    const relPath = `PRPs/plans/${fname}`;
    let content;
    try {
      content = readFileSync(resolve(relPath), 'utf-8');
    } catch {
      continue;
    }
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      try {
        const obj = JSON.parse(trimmed);
        jsonlEntries.push({ ...obj, file: relPath, line: idx + 1 });
      } catch {
        // Malformed jsonl line: not this check's concern.
      }
    });
  }

  // The v0.25.0 measurement-boundary marker.
  /** @type {string | null} */
  let marker = null;
  try {
    const markerRaw = readFileSync(resolve('PRPs/reports/efficiency/v0.25.0.json'), 'utf-8');
    const parsed = JSON.parse(markerRaw);
    if (typeof parsed.markerUtc === 'string' && parsed.markerUtc) {
      marker = parsed.markerUtc;
    }
  } catch {
    marker = null;
  }

  const result = checkTimestampContract({ files, jsonlEntries, marker });
  return {
    name: CHECK_NAME,
    ok: findings.length === 0 && result.ok,
    findings: [...findings, ...result.findings],
    notes: result.notes,
  };
}
