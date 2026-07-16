// @ts-check
/**
 * Content-invariant tests for Phase 2 of implement-phase-docs-sync
 * ("/relay-implement dispatch") — plugins/relay/commands/relay-implement.md's
 * new `### Phase A.3.5 — Docs-sync dispatch` sub-phase, plus the explicit
 * `feature`/`prd_path` grounding inputs this phase's revision added to
 * plugins/relay/agents/docs-updater.md and plugins/relay/agents/docs-reviewer.md
 * (re-opened Phase 1 deliverables — the original Phase 2 draft was blocked by
 * a HIGH code-review finding: docs-updater's only feature/prd_path derivation
 * path, orchestrator-run.json, does not exist at implement time).
 *
 * This is a companion file to docs-sync-phase1.test.mjs, NOT an extension of
 * it: docs-sync-phase1.test.mjs is explicitly scoped (by its own header
 * comment and by its "Existing-coverage scan" section) to Phase 1's four
 * files and asserts nothing about relay-implement.md or about the
 * feature/prd_path Inputs rows this phase adds — those rows and the
 * "### Deriving `feature` and `prd_path`" subsections did not exist when
 * docs-sync-phase1.test.mjs was authored. Confirmed via re-scan: no existing
 * node:test file (frontmatter-schema, dispatch-graph, path-existence,
 * artifact-naming, bootstrap-parity, registration-parity, native-validate,
 * version-parity, docs-sync-phase1) reads relay-implement.md's Phase A.3.5
 * body or docs-updater.md/docs-reviewer.md's feature/prd_path rows;
 * dispatch-graph.mjs's own test suite exercises its pure function via
 * in-memory fixtures, never the real relay-implement.md content, so it
 * provides no regression coverage for this phase's dispatch PAYLOAD SHAPE
 * (only, indirectly and only for its one real-wrapper AC-10 test, that a
 * referenced subagent_type resolves to a real agent file).
 *
 * Same idiom as docs-sync-phase1.test.mjs: relay ships "prompt + config, not
 * code" (CLAUDE.md), so these are prompt/config markdown files with no
 * companion production .mjs module to import — tests assert directly against
 * the real, already-implemented file content on disk via readFileSync,
 * mirroring scripts/validate/checks/path-existence.mjs's `runPathExistenceCheck()`
 * AC-5 precedent.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed, IMPLEMENTED Phase 2 plan (revision):
 * PRPs/plans/completed/implement-phase-docs-sync-phase-2-relay-implement-dispatch.plan.md
 *
 * Traceability (PRPs/prds/implement-phase-docs-sync.prd.md Acceptance Criteria
 * — in-scope for Phase 2 per its own Phase Details row: AC-1, AC-2, AC-4, AC-6.
 * AC-3 is unchanged Phase-1 groundwork, not re-touched here. AC-5/AC-7 remain
 * OUT_OF_PHASE_SCOPE, deferred to Phase 3/Phase 4 respectively):
 *
 *   AC-1 (implement-time sync happens) — Phase A.3.5 exists, is positioned
 *     strictly between Phase A.3 and Phase A.4, triggers exactly on the
 *     APPROVED standard-mode verdict, and dispatches docs-updater/
 *     docs-reviewer via Task non-interactively with diff_source: "patch"
 *     against the current attempt's diff.patch and explicit feature/prd_path
 *     grounding (plan AC-A1, AC-A6; the HIGH-finding grounding fix).
 *   AC-2 (non-interactive + question deferral) — deferred questions are
 *     sourced from BOTH docs-pair artifacts (docs-update.md's
 *     "## Deferred Questions" section, tagged writer; docs-review.jsonl's
 *     deferred_question field, tagged reviewer) and the Final output
 *     surface's Docs: line points at both, in both PRD mode and PRD-less
 *     mode (plan AC-A2, AC-A7).
 *   AC-4 (ordering + no commit) — Phase A.3.5 runs after APPROVED and before
 *     Phase A.4's D8 mutations, and issues no git commit (plan AC-A3).
 *   AC-6 (per-project + per-invocation opt-out) — `--no-docs` flag parsing,
 *     the docs_sync methodology read, and the Phase A.3.5 gate (with
 *     --no-docs taking precedence) (plan AC-A4).
 *
 * Also covered as sub-facets of the above (plan AC-A5, AC-A8):
 *   - Docs-sync budget exhaustion degrades gracefully to Phase A.4 rather
 *     than halting the whole invocation (PRD AC-1 / Technical Risks row 3).
 *   - Non-regression: /relay-approve's existing Phase 3 DOCS CYCLE dispatch
 *     (Step 3.1/3.2) still passes only pr/target_root — unaffected by this
 *     phase's feature/prd_path additions to the two agent files (PRD AC-1
 *     non-regression guarantee).
 *
 * Run: node --test scripts/validate/checks/docs-sync-phase2.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DOCS_UPDATER_PATH = 'plugins/relay/agents/docs-updater.md';
const DOCS_REVIEWER_PATH = 'plugins/relay/agents/docs-reviewer.md';
const RELAY_IMPLEMENT_PATH = 'plugins/relay/commands/relay-implement.md';
const RELAY_APPROVE_PATH = 'plugins/relay/commands/relay-approve.md';

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
 * input name (anchored — never a substring match anywhere in the row, so a
 * name mentioned inside another row's description column can't be
 * mismatched). Returns undefined if absent.
 * @param {string} content
 * @param {string} inputName
 * @returns {string | undefined}
 */
function findTableRow(content, inputName) {
  const escaped = inputName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const firstCellRe = new RegExp('^\\|\\s*`' + escaped + '`\\s*\\|');
  return content.split('\n').find((line) => firstCellRe.test(line.trim()));
}

/**
 * Extracts the lines from the first line matching `startLineRe` up to (but
 * excluding) the next line matching `endLineRe` — the node:test analogue of
 * the plan's own `awk '/start/,/end/'` VALIDATE-command idiom, used
 * throughout this plan's Level 2/3 Validation Commands. Returns undefined if
 * `startLineRe` is never found.
 * @param {string} content
 * @param {RegExp} startLineRe
 * @param {RegExp} endLineRe
 * @returns {string | undefined}
 */
function extractSection(content, startLineRe, endLineRe) {
  const lines = content.split('\n');
  const startIdx = lines.findIndex((line) => startLineRe.test(line));
  if (startIdx === -1) return undefined;
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (endLineRe.test(lines[i])) {
      endIdx = i;
      break;
    }
  }
  return lines.slice(startIdx, endIdx).join('\n');
}

/**
 * Slices `content` from the first occurrence of `startNeedle` up to (but
 * excluding) the next occurrence of `endNeedle` after it. Plain substring
 * search (not regex) so literal parens/backticks in markdown headings need
 * no escaping. Returns undefined if `startNeedle` is absent.
 * @param {string} content
 * @param {string} startNeedle
 * @param {string} endNeedle
 * @returns {string | undefined}
 */
function sliceBetween(content, startNeedle, endNeedle) {
  const startIdx = content.indexOf(startNeedle);
  if (startIdx === -1) return undefined;
  const endIdx = content.indexOf(endNeedle, startIdx + startNeedle.length);
  return endIdx === -1 ? content.slice(startIdx) : content.slice(startIdx, endIdx);
}

// ---------------------------------------------------------------------------
// AC-1 / AC-A6 (grounding fix) — docs-updater.md and docs-reviewer.md gain
// explicit feature/prd_path inputs, with orchestrator-run.json demoted to a
// fallback used only when they are omitted.
// ---------------------------------------------------------------------------

test('AC-1/AC-A6: docs-updater.md declares explicit optional feature/prd_path Inputs rows and a two-branch "Deriving feature and prd_path" subsection (explicit-first, orchestrator-run.json fallback)', () => {
  const content = readRepoFile(DOCS_UPDATER_PATH);

  const featureRow = findTableRow(content, 'feature');
  assert.ok(featureRow, 'expected an Inputs table row declaring `feature`');
  assert.match(featureRow, /optional string/);
  assert.match(featureRow, /skip the orchestrator-run\.json read for this value entirely/);

  const prdPathRow = findTableRow(content, 'prd_path');
  assert.ok(prdPathRow, 'expected an Inputs table row declaring `prd_path`');
  assert.match(prdPathRow, /optional absolute path/);
  assert.match(prdPathRow, /skip the orchestrator-run\.json read for this value entirely/);

  assert.ok(
    content.includes('### Deriving `feature` and `prd_path`'),
    'expected a "### Deriving `feature` and `prd_path`" subsection heading'
  );
  assert.match(content, /\*\*Explicit inputs supplied\.\*\* When `feature` and\/or `prd_path` are/);
  assert.match(content, /path standalone `\/relay-implement` uses: `orchestrator-run\.json`/);
  assert.match(content, /\*\*Fallback — orchestrator-run\.json read\.\*\* When `feature`\/`prd_path`/);

  assert.match(content, /Derive `feature` and `prd_path` per the "Deriving `feature` and/);
});

test('AC-1/AC-A6: docs-reviewer.md declares the symmetric explicit feature/prd_path inputs and the same two-branch Deriving subsection', () => {
  const content = readRepoFile(DOCS_REVIEWER_PATH);

  assert.match(content, /- \*\*`feature`\*\* \(optional string\): the feature slug; when supplied,/);
  assert.match(content, /- \*\*`prd_path`\*\* \(optional absolute path\): the source PRD path; when/);

  assert.ok(
    content.includes('### Deriving `feature` and `prd_path`'),
    'expected a "### Deriving `feature` and `prd_path`" subsection heading'
  );
  assert.match(content, /\*\*Explicit inputs supplied\.\*\* When `feature` \(and, in PRD mode,/);
  assert.match(content, /\*\*Fallback — orchestrator-run\.json read\.\*\* When `feature` is NOT/);
  assert.match(content, /From `feature`, you also derive:/);

  assert.match(content, /Derive `feature` and `prd_path` per the "Deriving `feature` and/);
});

// ---------------------------------------------------------------------------
// AC-1 / AC-4 — Phase A.3.5 exists, is positioned strictly between Phase A.3
// and Phase A.4, and triggers exactly on the APPROVED standard-mode verdict.
// ---------------------------------------------------------------------------

test('AC-1/AC-4: relay-implement.md\'s "### Phase A.3.5 — Docs-sync dispatch" is positioned strictly between Phase A.3 and Phase A.4, entered exactly on the APPROVED standard-mode verdict', () => {
  const content = readRepoFile(RELAY_IMPLEMENT_PATH);

  const idxA3 = content.indexOf('### Phase A.3 — Code-reviewer dispatch + verdict branching');
  const idxA35 = content.indexOf('### Phase A.3.5 — Docs-sync dispatch');
  const idxA4 = content.indexOf('### Phase A.4 — D8 post-approval mutations');

  assert.notEqual(idxA3, -1, 'expected a "### Phase A.3" heading');
  assert.notEqual(idxA35, -1, 'expected a "### Phase A.3.5 — Docs-sync dispatch" heading');
  assert.notEqual(idxA4, -1, 'expected a "### Phase A.4" heading');
  assert.ok(idxA3 < idxA35, 'expected Phase A.3 to appear before Phase A.3.5');
  assert.ok(idxA35 < idxA4, 'expected Phase A.3.5 to appear before Phase A.4');

  assert.match(
    content,
    /\*\*APPROVED\*\* → exit Phase A loop into Phase A\.3\.5 \(docs-sync dispatch\), then Phase A\.4 \(D8 mutations\)\./
  );
  assert.match(
    content,
    /Triggered exactly once when Phase A\.3 standard-mode returns APPROVED — never on an arbitration-mode verdict/
  );
});

// ---------------------------------------------------------------------------
// AC-1 / AC-A6 — the corrected dispatch payloads: explicit feature/prd_path,
// diff_source: "patch" against the current attempt's diff.patch, no
// undocumented prior_feedback key.
// ---------------------------------------------------------------------------

test('AC-1/AC-A6: Phase A.3.5 Step A dispatches docs-updater with explicit feature/prd_path, diff_source: "patch" against the attempt\'s diff.patch, non_interactive: true, and no undocumented prior_feedback key', () => {
  const content = readRepoFile(RELAY_IMPLEMENT_PATH);
  const stepA = sliceBetween(content, '**Step A — dispatch `docs-updater`', '**Step B — dispatch `docs-reviewer`');
  assert.ok(stepA, 'expected an extractable Step A dispatch block');

  assert.match(stepA, /Task\(subagent_type="docs-updater",/);
  assert.match(stepA, /feature: <feature>,/);
  assert.match(
    stepA,
    /prd_path: "PRPs\/prds\/<feature>\.prd\.md",\s+# PRD mode only \(is_prd_less == false\); key omitted entirely in PRD-less mode/
  );
  assert.match(stepA, /diff_source: "patch",/);
  assert.match(stepA, /patch_path: "<artifact_root><attempt>\/diff\.patch",/);
  assert.match(stepA, /non_interactive: true,/);

  assert.ok(
    !/prior_feedback\s*:/.test(stepA),
    'Step A dispatch payload must not carry the undocumented prior_feedback key (removed — HIGH code-review finding)'
  );
});

test('AC-1/AC-A6: Phase A.3.5 Step B dispatches docs-reviewer with explicit feature/prd_path and non_interactive: true, omits diff_source/patch_path, and documents why pr is omitted and feature/prd_path are explicit', () => {
  const content = readRepoFile(RELAY_IMPLEMENT_PATH);
  const stepB = sliceBetween(content, '**Step B — dispatch `docs-reviewer`', '**Step C — evaluate');
  assert.ok(stepB, 'expected an extractable Step B dispatch block');

  assert.match(stepB, /Task\(subagent_type="docs-reviewer",/);
  assert.match(stepB, /feature: <feature>,/);
  assert.match(
    stepB,
    /prd_path: "PRPs\/prds\/<feature>\.prd\.md",\s+# PRD mode only \(is_prd_less == false\); key omitted entirely in PRD-less mode/
  );
  assert.match(stepB, /non_interactive: true,/);
  assert.ok(!/diff_source/.test(stepB), 'docs-reviewer dispatch has no diff to read — diff_source is a docs-updater-only input');
  assert.ok(!/patch_path/.test(stepB), 'docs-reviewer dispatch has no diff to read — patch_path is a docs-updater-only input');

  assert.match(stepB, /`pr` is intentionally omitted — there is no PR yet at implement time\./);
  assert.match(
    stepB,
    /`feature` \(and, in PRD mode, `prd_path`\) are passed EXPLICITLY instead/
  );
});

// ---------------------------------------------------------------------------
// AC-4 — no commit is issued by the docs-sync sub-phase.
// ---------------------------------------------------------------------------

test('AC-4: Phase A.3.5 issues no git commit; item 7 documents the never-commit invariant explicitly', () => {
  const content = readRepoFile(RELAY_IMPLEMENT_PATH);
  const section = extractSection(content, /^### Phase A\.3\.5/, /^### Phase A\.4/);
  assert.ok(section, 'expected an extractable Phase A.3.5 section');

  assert.ok(!/git commit/i.test(section), 'Phase A.3.5 must never issue a git commit (Pillar 2 never-commit invariant)');
  assert.match(
    section,
    /\*\*No commit issued\.\*\* This sub-phase performs no commit action of any kind — edits from `docs-updater` land uncommitted in the worktree/
  );
});

// ---------------------------------------------------------------------------
// AC-1 (PRD Technical Risks row 3) — docs-sync budget exhaustion degrades
// gracefully to Phase A.4 rather than halting the whole invocation.
// ---------------------------------------------------------------------------

test('AC-1: docs-sync budget exhaustion (docs_review_attempts > max_docs_review_retries) degrades gracefully to Phase A.4 rather than halting, and Constraint 11 + the "What you do NOT do" bullet both document the rule', () => {
  const content = readRepoFile(RELAY_IMPLEMENT_PATH);
  const section = extractSection(content, /^### Phase A\.3\.5/, /^### Phase A\.4/);
  assert.ok(section, 'expected an extractable Phase A.3.5 section');

  assert.match(section, /docs_sync_outcome = "BUDGET_EXCEEDED"/);
  assert.match(section, /proceed to Phase A\.4 WITHOUT halting the command/);
  assert.match(section, /the docs-sync sub-phase never blocks code delivery/);

  assert.match(
    content,
    /\*\*Never block D8 mutations on docs-sync budget exhaustion\.\*\* The docs-sync sub-phase \(Phase A\.3\.5\) carries its own retry budget \(`max_docs_review_retries=2`\)/
  );
  assert.match(
    content,
    /\*\*Blocking code approval on a docs-sync failure\*\* — the docs-sync sub-phase \(Phase A\.3\.5\) degrades gracefully on budget exhaustion; D8 mutations proceed regardless\./
  );
});

// ---------------------------------------------------------------------------
// AC-2 / AC-A7 — deferred questions sourced from BOTH docs-pair artifacts;
// the Final output surface's Docs: line points at both, in both PRD mode and
// PRD-less mode (source/pointer mismatch fix).
// ---------------------------------------------------------------------------

test('AC-2/AC-A7: Phase A.3.5 item 6 sources deferred questions from BOTH docs-update.md\'s "## Deferred Questions" section (tagged writer) and docs-review.jsonl\'s deferred_question field (tagged reviewer)', () => {
  const content = readRepoFile(RELAY_IMPLEMENT_PATH);
  const section = extractSection(content, /^### Phase A\.3\.5/, /^### Phase A\.4/);
  assert.ok(section, 'expected an extractable Phase A.3.5 section');

  assert.match(section, /`PRPs\/reports\/<feature>\/docs-update\.md`'s `## Deferred Questions`/);
  assert.match(section, /tagged `writer`/);
  assert.match(section, /the just-appended `docs-review\.jsonl` line's/);
  assert.match(section, /`deferred_question` field \(string or `null`\)/);
  assert.match(section, /tagged `reviewer`/);
});

test('AC-2/AC-A7: the Final output surface\'s Docs: line points at BOTH deferred-question artifacts, identically in the PRD-mode and PRD-less-mode blocks (no source/pointer mismatch)', () => {
  const content = readRepoFile(RELAY_IMPLEMENT_PATH);

  const dualPointerRe =
    /Docs: `<docs_sync_outcome>` \(`APPROVED` \/ `BUDGET_EXCEEDED` \/ `SKIPPED \(--no-docs\)` \/ `SKIPPED \(docs_sync: false\)`\)\. When `docs_deferred_questions` is non-empty, see `PRPs\/reports\/<feature>\/docs-update\.md`'s `## Deferred Questions` section \(writer-side questions\) and\/or `PRPs\/reports\/<feature>\/docs-review\.jsonl`'s `deferred_question` field \(reviewer-side questions\)/g;

  const matches = content.match(dualPointerRe);
  assert.ok(
    matches && matches.length === 2,
    `expected the dual-artifact Docs: pointer line to appear exactly twice (PRD mode + PRD-less mode), found ${matches ? matches.length : 0}`
  );
});

// ---------------------------------------------------------------------------
// AC-6 — --no-docs flag parsing + docs_sync methodology read gate Phase
// A.3.5, with --no-docs taking precedence over docs_sync_enabled.
// ---------------------------------------------------------------------------

test('AC-6: `## Parse arguments` extracts --no-docs into no_docs_flag (default false), Phase A.0 reads docs_sync into docs_sync_enabled (default true when absent), and Phase A.3.5\'s gate honors both with --no-docs taking precedence', () => {
  const content = readRepoFile(RELAY_IMPLEMENT_PATH);

  assert.match(
    content,
    /Scan `\$ARGUMENTS` for the literal token `--no-docs`; when present, strip it from `\$ARGUMENTS` and record `no_docs_flag = true` \(default `false`\)/
  );
  assert.match(
    content,
    /extract the `docs_sync` key, recording `docs_sync_enabled` \(boolean\)\. Default `true` when the key is absent/
  );

  const section = extractSection(content, /^### Phase A\.3\.5/, /^### Phase A\.4/);
  assert.ok(section, 'expected an extractable Phase A.3.5 section');
  assert.match(
    section,
    /If `no_docs_flag == true` OR `docs_sync_enabled == false`, skip the entire docs-sync sub-phase/
  );
  assert.match(
    section,
    /checked first — `--no-docs` takes precedence over `docs_sync_enabled` when both are true/
  );
});

// ---------------------------------------------------------------------------
// AC-1 non-regression (plan AC-A8) — /relay-approve's existing Phase 3 DOCS
// CYCLE dispatch is unaffected by this phase's feature/prd_path additions to
// docs-updater.md/docs-reviewer.md; it still passes only pr/target_root and
// falls back to orchestrator-run.json exactly as before.
// ---------------------------------------------------------------------------

test('AC-1 non-regression (plan AC-A8): relay-approve.md\'s Phase 3 DOCS CYCLE dispatch (Step 3.1/3.2) still passes only pr/target_root to docs-updater/docs-reviewer — no feature/prd_path key was added to this call site', () => {
  const content = readRepoFile(RELAY_APPROVE_PATH);

  const step31 = sliceBetween(
    content,
    '### Step 3.1 — Dispatch docs-updater (writer)',
    '### Step 3.2 — Dispatch docs-reviewer (reviewer)'
  );
  assert.ok(step31, 'expected an extractable Step 3.1 body');
  assert.match(step31, /- `pr`: the `<pr>` argument \(PR number or URL\)/);
  assert.match(step31, /- `target_root`: the absolute path to the repository root/);
  assert.ok(!/- `feature`/.test(step31), 'Step 3.1 dispatch bullets must not gain a `feature` key (AC-A8 non-regression)');
  assert.ok(!/- `prd_path`/.test(step31), 'Step 3.1 dispatch bullets must not gain a `prd_path` key (AC-A8 non-regression)');
  assert.match(step31, /1\. Read `PRPs\/reports\/<feature>\/orchestrator-run\.json` to extract `feature` and `prd_path`\./);

  const step32 = sliceBetween(
    content,
    '### Step 3.2 — Dispatch docs-reviewer (reviewer)',
    '### Step 3.3 — Evaluate docs-reviewer verdict'
  );
  assert.ok(step32, 'expected an extractable Step 3.2 body');
  assert.match(step32, /- `pr`: the `<pr>` argument/);
  assert.match(step32, /- `target_root`: the absolute path to the repository root/);
  assert.ok(!/- `feature`/.test(step32), 'Step 3.2 dispatch bullets must not gain a `feature` key (AC-A8 non-regression)');
  assert.ok(!/- `prd_path`/.test(step32), 'Step 3.2 dispatch bullets must not gain a `prd_path` key (AC-A8 non-regression)');
});
