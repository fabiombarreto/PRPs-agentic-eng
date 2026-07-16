// @ts-check
/**
 * Content-invariant tests for Phase 3 of implement-phase-docs-sync
 * ("Approve as safety net") — plugins/relay/commands/relay-approve.md's new
 * `docs_sync` read + dual-condition gating, and
 * docs/context/methodology.md's correction of its stale
 * "Phase 3 ... not built yet" sentence now that this phase ships.
 *
 * This is a companion file to docs-sync-phase1.test.mjs and
 * docs-sync-phase2.test.mjs, NOT an extension of either: neither prior file
 * asserts on relay-approve.md's Phase 0 P7 read step, the Phase 3 DOCS CYCLE
 * / Phase 4 DOCS COMMIT dual-condition gates, the idempotency +
 * manifest-consultation prose, or the Phase 5 summary's `docs_sync: false`
 * outcome line. docs-sync-phase2.test.mjs's one relay-approve.md test
 * ("AC-1 non-regression (plan AC-A8)") is scoped strictly to Step 3.1/3.2's
 * dispatch bullets (asserting NO feature/prd_path key was added there) — it
 * does not read Phase 0, Phase 3's gate/idempotency prose, Phase 4's gate, or
 * Phase 5's summary line, so there is no overlap with this file's assertions.
 *
 * Same idiom as docs-sync-phase1.test.mjs / docs-sync-phase2.test.mjs: relay
 * ships "prompt + config, not code" (CLAUDE.md), so these are prompt/config
 * markdown files with no companion production .mjs module to import — tests
 * assert directly against the real, already-implemented file content on disk
 * via readFileSync, mirroring
 * scripts/validate/checks/path-existence.mjs's `runPathExistenceCheck()`
 * AC-5 precedent.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed, IMPLEMENTED Phase 3 plan:
 * PRPs/plans/completed/implement-phase-docs-sync-phase-3-approve-as-safety-net.plan.md
 *
 * Traceability (PRPs/prds/implement-phase-docs-sync.prd.md Acceptance
 * Criteria — in-scope for Phase 3 per its own Phase Details row: AC-5,
 * AC-6. AC-1/AC-2/AC-3/AC-4 are unchanged Phase-1/Phase-2 groundwork,
 * already covered by docs-sync-phase1.test.mjs / docs-sync-phase2.test.mjs
 * and not re-touched here (R-DUPLICATE). AC-7 remains OUT_OF_PHASE_SCOPE,
 * deferred to Phase 4):
 *
 *   AC-6 (per-project + per-invocation opt-out, the /relay-approve half —
 *     plan AC-A1, AC-A2, AC-A5) — Phase 0 gains a P7 step reading
 *     `docs_sync` into `docs_sync_enabled` (default true when the key or
 *     the file itself is absent, soft-fail no HALT), read strictly before
 *     the Phase 3 gate consumes it; Phase 3 DOCS CYCLE and Phase 4 DOCS
 *     COMMIT both gate on `no_docs_flag == true OR docs_sync_enabled ==
 *     false` with `--no-docs` checked first (precedence) and
 *     `docs_sync_outcome` distinguishing the two skip reasons; Phase 5's
 *     summary Docs: line reports `skipped (docs_sync: false)` as a distinct
 *     outcome; docs/context/methodology.md no longer claims approve-time
 *     gating is unbuilt.
 *   AC-5 (approve retained + idempotent — plan AC-A3, AC-A4) — Phase 3's
 *     prose documents the pass is idempotent against implement-time sync
 *     (docs-updater's comparison logic evaluates against the CURRENT
 *     `docs/` state, so an already-applied edit produces no delta — a
 *     low-delta/near-empty manifest is expected, not a failure) and may
 *     consult the implement-time manifest at
 *     `PRPs/reports/<feature>/docs-update.md` to avoid re-proposing
 *     already-applied edits.
 *
 * Run: node --test scripts/validate/checks/docs-sync-phase3.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const RELAY_APPROVE_PATH = 'plugins/relay/commands/relay-approve.md';
const METHODOLOGY_PATH = 'docs/context/methodology.md';

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
 * Extracts the lines from the first line matching `startLineRe` up to (but
 * excluding) the next line matching `endLineRe`. Returns undefined if
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

// Shared across the Phase 3 DOCS CYCLE and Phase 4 DOCS COMMIT gates — both
// phases record the identical docs_sync_outcome naming + precedence
// sentence verbatim (relay-approve.md Tasks 2 and 3 mirror the same
// convention at both call sites).
const OUTCOME_NAMING_RE =
  /Record `docs_sync_outcome = "SKIPPED \(--no-docs\)"` when `no_docs_flag == true` \(checked first — `--no-docs` takes precedence over `docs_sync_enabled` when both are true\), otherwise `docs_sync_outcome = "SKIPPED \(docs_sync: false\)"` when only `docs_sync_enabled == false` triggered the skip\./;

// ---------------------------------------------------------------------------
// AC-6 (PRD AC-6, plan AC-A1/AC-A2) — Phase 0 P7: read docs_sync into
// docs_sync_enabled, default true when the key or the file is absent.
// ---------------------------------------------------------------------------

test('AC-A1/AC-A2 (PRD AC-6): Phase 0 gains a P7 step that reads docs_sync from docs/context/methodology.md into docs_sync_enabled, defaulting true when the key or the file itself is absent (soft-fail, no HALT)', () => {
  const content = readRepoFile(RELAY_APPROVE_PATH);

  assert.ok(
    content.includes('### P7 — Read `docs_sync` from `docs/context/methodology.md`'),
    'expected a "### P7" step heading reading docs_sync'
  );

  assert.match(
    content,
    /Read `<target_root>\/docs\/context\/methodology\.md` frontmatter and extract the `docs_sync` key, recording `docs_sync_enabled` \(boolean\)\. Default `true` when the key is absent, mirroring the `tdd` absence-handling precedent/
  );
  assert.match(
    content,
    /If `docs\/context\/methodology\.md` itself does not exist, also default `docs_sync_enabled = true` and note the absence — do not HALT \(mirrors the existing soft-fail treatment of a missing `orchestrator-run\.json` in P6\)\./
  );
});

test('AC-A1/AC-A2 (PRD AC-6): docs_sync_enabled is read in Phase 0 (P7), strictly before the Phase 3 DOCS CYCLE gate consumes it', () => {
  const content = readRepoFile(RELAY_APPROVE_PATH);

  const readIdx = content.indexOf('recording `docs_sync_enabled` (boolean)');
  const phase3Idx = content.indexOf('## Phase 3: DOCS CYCLE');

  assert.notEqual(readIdx, -1, 'expected to find the docs_sync_enabled read step');
  assert.notEqual(phase3Idx, -1, 'expected a "## Phase 3: DOCS CYCLE" heading');
  assert.ok(
    readIdx < phase3Idx,
    `expected docs_sync_enabled to be read (index ${readIdx}) before the Phase 3 DOCS CYCLE heading (index ${phase3Idx})`
  );
});

// ---------------------------------------------------------------------------
// AC-6 (PRD AC-6, plan AC-A1/AC-A2) — Phase 3 DOCS CYCLE and Phase 4 DOCS
// COMMIT both apply the identical dual-condition gate, with --no-docs
// checked first (precedence over docs_sync_enabled).
// ---------------------------------------------------------------------------

test('AC-A1/AC-A2 (PRD AC-6): Phase 3 DOCS CYCLE gates on no_docs_flag == true OR docs_sync_enabled == false, with --no-docs checked first (precedence) and docs_sync_outcome distinguishing the two skip reasons', () => {
  const content = readRepoFile(RELAY_APPROVE_PATH);
  const section = extractSection(content, /^## Phase 3: DOCS CYCLE$/, /^## Phase 4: DOCS COMMIT/);
  assert.ok(section, 'expected an extractable "## Phase 3: DOCS CYCLE" section');

  assert.match(
    section,
    /If `no_docs_flag == true` OR `docs_sync_enabled == false`, skip this phase entirely and proceed to Phase 4 \(log a one-line skip note naming which of the two gated it\)\./
  );
  assert.match(section, OUTCOME_NAMING_RE);
});

test('AC-A1 (PRD AC-6): Phase 4 DOCS COMMIT applies the identical dual-condition gate, so both docs phases honor docs_sync consistently (>=2 occurrences of the docs_sync_enabled gate across the file)', () => {
  const content = readRepoFile(RELAY_APPROVE_PATH);
  const section = extractSection(content, /^## Phase 4: DOCS COMMIT/, /^## Phase 5: OUTPUT/);
  assert.ok(section, 'expected an extractable "## Phase 4: DOCS COMMIT + PUSH" section');

  assert.match(
    section,
    /If `no_docs_flag == true` OR `docs_sync_enabled == false`, skip this phase entirely \(log a one-line skip note naming which of the two gated it\)\./
  );
  assert.match(section, OUTCOME_NAMING_RE);

  const occurrences = content.split('docs_sync_enabled == false').length - 1;
  assert.ok(
    occurrences >= 2,
    `expected >=2 occurrences of "docs_sync_enabled == false" (Phase 3 + Phase 4 gates), found ${occurrences}`
  );
});

// ---------------------------------------------------------------------------
// AC-5 (PRD AC-5, plan AC-A3/AC-A4) — Phase 3 prose documents idempotency
// against implement-time sync and optional implement-time manifest
// consultation.
// ---------------------------------------------------------------------------

test('AC-A3/AC-A4 (PRD AC-5): Phase 3 prose documents the pass is idempotent against implement-time sync (docs-updater compares against the CURRENT docs/ state, so a low-delta/near-empty manifest is expected, not a failure) and may consult the implement-time manifest to avoid re-proposing applied edits', () => {
  const content = readRepoFile(RELAY_APPROVE_PATH);
  const section = extractSection(content, /^## Phase 3: DOCS CYCLE$/, /^## Phase 4: DOCS COMMIT/);
  assert.ok(section, 'expected an extractable "## Phase 3: DOCS CYCLE" section');

  assert.match(
    section,
    /This pass is \*\*idempotent\*\* against implement-time sync: when `\/relay-implement`'s own docs-sync sub-phase \(Phase A\.3\.5\) already synced `docs\/` for this feature, `docs-updater`'s comparison logic evaluates against the \*current\* state of each target file \(not merely diff presence\), so an edit already present in `docs\/` produces no delta on this second pass — operators should expect a low-delta or near-empty manifest in that case, not treat it as a failure\./
  );
  assert.match(
    section,
    /The `docs-updater` invocation for this phase may also consult the implement-time manifest at `PRPs\/reports\/<feature>\/docs-update\.md` \(when present\) to avoid re-proposing edits already applied — noted here as documentation of existing\/expected behavior, not a new agent input or contract change\./
  );
});

// ---------------------------------------------------------------------------
// AC-6 (PRD AC-6, plan AC-A1) — Phase 5 summary reports the docs_sync: false
// skip outcome as a distinct fourth vocabulary item.
// ---------------------------------------------------------------------------

test("AC-A1 (PRD AC-6): Phase 5 Step 5.1's structured summary Docs: line reports skipped (docs_sync: false) as a distinct outcome alongside skipped (--no-docs), mirroring relay-implement.md's four-way outcome vocabulary", () => {
  const content = readRepoFile(RELAY_APPROVE_PATH);
  const section = extractSection(content, /^### Step 5\.1/, /^### Step 5\.2/);
  assert.ok(section, 'expected an extractable "### Step 5.1" section');

  assert.match(
    section,
    /Docs:\s+\[APPROVED \+ pushed to `<base-branch>` \| skipped \(--no-docs\) \| skipped \(docs_sync: false\) \| APPROVED \+ push FAILED \(see FAILED_DOCS_PUSH_BLOCKED\)\]/
  );
});

// ---------------------------------------------------------------------------
// AC-6 (PRD AC-6, plan AC-A5) — docs/context/methodology.md's "## Docs Sync"
// section is present-tensed; the stale "not built yet" sentence is gone.
// ---------------------------------------------------------------------------

test('AC-A5 (PRD AC-6): docs/context/methodology.md\'s "## Docs Sync" section is present-tensed — both /relay-implement and /relay-approve now read docs_sync and self-skip — and the stale "not built yet" sentence is gone', () => {
  const content = readRepoFile(METHODOLOGY_PATH);
  const section = extractSection(content, /^## Docs Sync$/, /^## Other methodologies$/);
  assert.ok(section, 'expected an extractable "## Docs Sync" section');

  assert.ok(!section.includes('not built yet'), 'stale "not built yet" phrasing must be removed');
  assert.ok(
    !content.includes('once Phase 2/Phase 3 wire the gating logic'),
    'the "How to override" future-tense caveat must be dropped'
  );

  assert.match(
    section,
    /Both\s+`\/relay-implement`\s+\(Phase 2\)\s+and\s+`\/relay-approve`\s+\(Phase 3\)\s+now read\s+`docs_sync`:/
  );
  assert.match(
    section,
    /each command wires its own skip logic\s+—\s+self-skipping\s+its respective docs cycle when\s+`docs_sync_enabled == false`\./
  );
  assert.match(section, /`docs_sync` governs BOTH the implement-time and approve-time docs/);
  assert.match(section, /disables automated docs sync for\s+this project entirely/);
  assert.match(
    section,
    /`--no-docs` is a separate, per-invocation\s+override, shipped on both\s+`\/relay-implement` and `\/relay-approve`/
  );
});
