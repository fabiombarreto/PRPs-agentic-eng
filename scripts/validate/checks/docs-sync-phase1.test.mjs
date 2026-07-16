// @ts-check
/**
 * Content-invariant tests for Phase 1 of implement-phase-docs-sync
 * ("Agent capability + config surface") — plugins/relay/agents/docs-updater.md,
 * plugins/relay/agents/docs-reviewer.md, docs/context/methodology.md, and
 * plugins/relay/skills/context-builder/SKILL.md.
 *
 * Phase 1 touches ONLY prompt/config markdown (relay ships "prompt + config,
 * not code" — CLAUDE.md); there is no application-source module under test,
 * so there is no companion production .mjs for this file to import. Instead
 * these tests assert directly against the real, already-implemented file
 * content on disk — the same idiom
 * scripts/validate/checks/path-existence.mjs's `runPathExistenceCheck()` AC-5
 * test already uses in this repo (a real `readFileSync`/`existsSync` pass
 * over real markdown content). That in-repo precedent is what makes a
 * persisted content-check idiomatic here, rather than out of node:test's
 * scope.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed, IMPLEMENTED Phase 1 plan
 * (PRPs/plans/completed/implement-phase-docs-sync-phase-1-agent-capability-config-surface.plan.md).
 * Every assertion below targets a specific contract string/structure named by
 * that plan's Files to Change + Acceptance Criteria — not mere non-emptiness
 * — so a future regression (a dropped Inputs row, a renamed gate phrase, a
 * reverted docs_sync default) fails this suite.
 *
 * Traceability (PRPs/prds/implement-phase-docs-sync.prd.md Acceptance Criteria):
 *   AC-1 (implement-time sync happens) — groundwork slice only: the
 *     backward-compatible defaults that keep the existing /relay-approve
 *     call site working (plan AC-A6).
 *   AC-2 (non-interactive + question deferral) — docs-updater's
 *     MUST-NOT-ask gate + "## Deferred Questions" section; docs-reviewer's
 *     MUST-NOT-ask gate + `deferred_question` jsonl field (plan AC-A2).
 *   AC-3 (pre-PR diff source + scope) — docs-updater's `diff_source` /
 *     `patch_path` inputs, the worktree/patch branching, and the docs_sync
 *     read + effective-configuration manifest header (plan AC-A1, AC-A5).
 *   AC-6 (per-project opt-out) — groundwork slice only: the `docs_sync`
 *     frontmatter key + "## Docs Sync" body section in
 *     docs/context/methodology.md (plan AC-A3).
 *   AC-7 (docs + site describe the new model) — groundwork slice only:
 *     context-builder's docs_sync emission/preservation behavior
 *     (plan AC-A4). The full AC-7 (architecture.md narrative, documentation/
 *     site, changelog, plugin.json bump) is Phase 4 scope, not asserted here.
 *
 * AC-4 (ordering + no commit) and AC-5 (approve retained + idempotent) are
 * OUT_OF_PHASE_SCOPE for Phase 1 — no assertion here; see
 * PRPs/reports/implement-phase-docs-sync/test-suite.diff.
 *
 * Run: node --test scripts/validate/checks/docs-sync-phase1.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DOCS_UPDATER_PATH = 'plugins/relay/agents/docs-updater.md';
const DOCS_REVIEWER_PATH = 'plugins/relay/agents/docs-reviewer.md';
const METHODOLOGY_PATH = 'docs/context/methodology.md';
const CONTEXT_BUILDER_SKILL_PATH = 'plugins/relay/skills/context-builder/SKILL.md';

/**
 * Reads a repo-root-relative file and normalizes line endings to `\n`, so
 * `^...$`/`/m` assertions below behave identically regardless of the
 * checkout's line-ending configuration.
 * @param {string} relPath
 * @returns {string}
 */
function readRepoFile(relPath) {
  return readFileSync(resolve(relPath), 'utf-8').replace(/\r\n/g, '\n');
}

/**
 * Finds the markdown table row whose FIRST cell is the given backtick-quoted
 * input name, e.g. findTableRow(content, 'diff_source') returns the
 * "| `diff_source` | ... |" line. Anchored to the first cell (not a
 * substring match anywhere in the row) so a name that also appears inside
 * another row's description column (e.g. `patch_path` is mentioned in prose
 * inside the `diff_source` row) is never mismatched. Returns undefined if
 * absent.
 * @param {string} content
 * @param {string} inputName
 * @returns {string | undefined}
 */
function findTableRow(content, inputName) {
  const escaped = inputName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const firstCellRe = new RegExp('^\\|\\s*`' + escaped + '`\\s*\\|');
  return content.split('\n').find((line) => firstCellRe.test(line.trim()));
}

// ---------------------------------------------------------------------------
// AC-1 (implement-time sync happens) — groundwork slice only (plan AC-A6):
// every new input on docs-updater defaults to reproducing today's
// /relay-approve behavior exactly, so the existing call site (which passes
// only pr + target_root) keeps working unmodified.
// ---------------------------------------------------------------------------

test('AC-1 groundwork: docs-updater.md declares diff_source (default "pr") and non_interactive (default "false") so the existing /relay-approve call site stays backward compatible', () => {
  const content = readRepoFile(DOCS_UPDATER_PATH);

  const diffSourceRow = findTableRow(content, 'diff_source');
  assert.ok(diffSourceRow, 'expected an Inputs table row declaring `diff_source`');
  assert.match(diffSourceRow, /`pr`/);
  assert.match(diffSourceRow, /`worktree`/);
  assert.match(diffSourceRow, /`patch`/);
  assert.match(diffSourceRow, /Default `pr`/);
  assert.match(diffSourceRow, /Omitting `diff_source` reproduces today's `\/relay-approve` behavior exactly/);

  const nonInteractiveRow = findTableRow(content, 'non_interactive');
  assert.ok(nonInteractiveRow, 'expected an Inputs table row declaring `non_interactive`');
  assert.match(nonInteractiveRow, /Default `false`/);
  assert.match(nonInteractiveRow, /Omitting `non_interactive` reproduces today's `\/relay-approve` behavior exactly/);
});

// ---------------------------------------------------------------------------
// AC-2 (non-interactive + question deferral) — plan AC-A2
// ---------------------------------------------------------------------------

test('AC-2 (docs-updater): non_interactive:true MUST-NOT-ask gate is declared on the Inputs row and in the Interactivity Clause, with a dedicated "## Deferred Questions" manifest section', () => {
  const content = readRepoFile(DOCS_UPDATER_PATH);

  const nonInteractiveRow = findTableRow(content, 'non_interactive');
  assert.ok(nonInteractiveRow);
  assert.match(nonInteractiveRow, /MUST NOT ask the operator any question under any circumstance/);

  assert.match(content, /\*\*`non_interactive` gate\.\*\* When `non_interactive: true`, you MUST/);

  assert.ok(content.includes('## Deferred Questions'), 'expected a "## Deferred Questions" manifest section heading');
  assert.match(content, /distinct from `## Candidate Decisions`/);
});

test('AC-2 (docs-reviewer): non_interactive input is declared and, when true, the agent MUST NOT ask and instead records a deferred_question jsonl field', () => {
  const content = readRepoFile(DOCS_REVIEWER_PATH);

  assert.match(content, /\*\*`non_interactive`\*\* \(optional boolean, default `false`\)/);
  assert.match(content, /MUST NOT ask the operator any question — see Hard/);

  assert.match(content, /\*\*When `non_interactive: true`, you MUST NOT ask\*\* the operator/);
  assert.match(content, /`deferred_question` field \(string, or `null` when/);

  assert.match(content, /"deferred_question": null/);
  assert.match(content, /`deferred_question` \(string, or `null` when no question arose\) is/);
});

// ---------------------------------------------------------------------------
// AC-3 (pre-PR diff source + scope) — plan AC-A1 + AC-A5
// ---------------------------------------------------------------------------

test('AC-3: docs-updater.md branches diff capture on diff_source (worktree via `git -C <target_root> diff`, patch via `Read` on patch_path), and reads docs_sync into the manifest\'s effective-configuration header', () => {
  const content = readRepoFile(DOCS_UPDATER_PATH);

  assert.match(content, /`worktree`: run `git -C <target_root> diff`/);
  assert.match(content, /`patch`: read the file at `patch_path` directly via `Read`/);

  const patchPathRow = findTableRow(content, 'patch_path');
  assert.ok(patchPathRow, 'expected an Inputs table row declaring `patch_path`');
  assert.match(patchPathRow, /required only when `diff_source: patch`/);

  assert.match(content, /`docs_sync` frontmatter key \(default `true` when absent/);
  assert.match(
    content,
    /\*\*Effective configuration:\*\* diff_source=<pr\|worktree\|patch>, non_interactive=<true\|false>, docs_sync=<true\|false>/
  );
});

// ---------------------------------------------------------------------------
// AC-6 (per-project + per-invocation opt-out) — groundwork slice only
// (plan AC-A3): the per-project master switch. The per-invocation
// `--no-docs` override is Phase 2 scope, not asserted here.
// ---------------------------------------------------------------------------

test('AC-6 groundwork: docs/context/methodology.md declares docs_sync: true in frontmatter (default) plus a "## Docs Sync" body section documenting the switch', () => {
  const content = readRepoFile(METHODOLOGY_PATH);

  assert.match(content, /^docs_sync: true$/m);
  assert.ok(content.includes('## Docs Sync'), 'expected a "## Docs Sync" body section heading');
  assert.match(content, /Current state: \*\*true\*\* \(default\) — `docs_sync: true` in the/);
  // Updated by the Phase 3 (Approve as safety net) session: methodology.md's
  // "is intended to govern" (Phase-1-era forward-looking phrasing) became
  // present-tense "governs" once both /relay-implement and /relay-approve
  // shipped their docs_sync gates. See test-suite.diff Phase 3 session,
  // lifecycle ledger (EXISTING_TEST_UPDATED).
  assert.match(content, /`docs_sync` governs BOTH the implement-time and/);
});

// ---------------------------------------------------------------------------
// AC-7 (docs + site describe the new model) — groundwork slice only
// (plan AC-A4): context-builder's emission/preservation behavior. The full
// AC-7 (architecture.md narrative, documentation/ site, changelog,
// plugin.json bump) is Phase 4 scope, not asserted here.
// ---------------------------------------------------------------------------

test('AC-7 groundwork: context-builder SKILL.md emits docs_sync: true in its methodology.md template and documents always-emit (*init) + preserve-or-backfill (*update) behavior', () => {
  const content = readRepoFile(CONTEXT_BUILDER_SKILL_PATH);

  assert.match(
    content,
    /docs_sync: true\s+# true \| false — per-project master switch for automated docs\/ sync \(docs-updater\/docs-reviewer\)/
  );
  assert.match(content, /Always emit `docs_sync: true` — the per-project master switch for/);
  assert.match(content, /\*\*`docs_sync` preservation\*\*: if `docs_sync` is already present in/);
  assert.match(content, /never remove or flip an existing value/);
});
