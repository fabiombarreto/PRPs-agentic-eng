// @ts-check
/**
 * Content-invariant tests for Phase 4 of implement-phase-docs-sync
 * ("Docs + site") — docs/context/architecture.md, docs/api-reference.md,
 * docs/domain/flows.md, docs/context/integrations.md, docs/KNOWLEDGE_BASE.md,
 * docs/decisions.md, documentation/concepts/pillars.html,
 * documentation/concepts/interactivity-boundary.html,
 * documentation/roadmap/status.html, documentation/reference/commands.html,
 * documentation/reference/agents.html,
 * documentation/assets/data/search-index.json, and
 * documentation/changelog.html (including its permanent historical record
 * of plugins/relay/.claude-plugin/plugin.json's version bump — the live
 * plugin.json file itself is not read by this suite; see the AC-A7 test's
 * 2026-07-29 EXISTING_TEST_UPDATED lifecycle note below).
 *
 * This is a companion file to docs-sync-phase1.test.mjs,
 * docs-sync-phase2.test.mjs, and docs-sync-phase3.test.mjs, NOT an extension
 * of any of them: none of the three prior files reads any of the files this
 * phase touches (they are scoped to plugins/relay/agents/docs-updater.md,
 * docs-reviewer.md, plugins/relay/commands/relay-implement.md,
 * relay-approve.md, and docs/context/methodology.md). Confirmed by a full
 * pre-authoring corpus run (`node --test scripts/validate/checks/*.test.mjs
 * scripts/eval.test.mjs`) BEFORE authoring anything: 100 pass, 0 fail — no
 * Phase 4 edit touched a file any prior docs-sync-phase*.test.mjs asserts on,
 * so no EXISTING_TEST_UPDATED lifecycle op was needed this session (unlike
 * Phase 3, which had to update one Phase-1 assertion).
 *
 * Same idiom as the three prior files: relay ships "prompt + config, not
 * code" (CLAUDE.md), and this phase is `phase_type: docs` (pure `docs/` +
 * `documentation/` prose) — there is no companion production .mjs module to
 * import, so these tests assert directly against the real, already-
 * implemented file content on disk via readFileSync, mirroring
 * scripts/validate/checks/path-existence.mjs's `runPathExistenceCheck()`
 * AC-5 precedent.
 *
 * Scope note (R-DUPLICATE): `scripts/validate/checks/version-parity.mjs`
 * already discriminates plugin.json-vs-changelog.html VERSION-NUMBER parity
 * (checkVersionParity, covered by its own version-parity.test.mjs). This
 * file does NOT re-test that cross-file number-matching logic. The one test
 * below that touches changelog.html instead asserts a CONTENT invariant
 * version-parity.mjs never inspects: that the changelog's 0.22.0 heading is
 * backed by real, feature-specific release prose (not a bare version
 * heading), including the dated historical sentence documenting that this
 * feature bumped plugin.json's version from 0.21.0 to 0.22.0 — the AC-7
 * "changelog entry ... present" invariant. It deliberately does NOT read
 * plugin.json's LIVE version field: see the 2026-07-29 EXISTING_TEST_UPDATED
 * lifecycle note below for why that would be a transient, release-cut-
 * fragile assertion rather than a timeless one.
 *
 * Authored test-after (docs/context/methodology.md: tdd: false +
 * test_frameworks: ["node:test"]) against the already-implemented,
 * code-reviewed, IMPLEMENTED Phase 4 plan:
 * PRPs/plans/completed/implement-phase-docs-sync-phase-4-docs-site.plan.md
 *
 * Traceability (PRPs/prds/implement-phase-docs-sync.prd.md Acceptance
 * Criteria — Phase 4's Phase Details row names only AC-7 as in-scope; AC-1
 * through AC-6 are unchanged Phase-1/2/3 groundwork already covered by
 * docs-sync-phase{1,2,3}.test.mjs and are OUT_OF_PHASE_SCOPE here, not
 * re-touched (R-DUPLICATE)):
 *
 *   AC-7 (docs + site describe the new model — plan AC-A1 through AC-A7) —
 *     docs/context/architecture.md's Three-pillar section documents
 *     implement-time docs-sync as Pillar 2's PRIMARY pass (gated by
 *     docs_sync/--no-docs) with Pillar 3 recast as a safety-net
 *     reconciliation pass; docs/api-reference.md's docs-updater/docs-reviewer
 *     rows document the dual dispatch with per-invocation diff sources;
 *     docs/domain/flows.md and docs/context/integrations.md no longer name
 *     the nonexistent /approve-implementation command; docs/decisions.md
 *     carries the new [2026-07-16] entry recording both conscious
 *     refinements; docs/KNOWLEDGE_BASE.md's architecture.md index entry
 *     flags the Pillar 2/3 docs-sync split; documentation/concepts/pillars.html
 *     no longer asserts "Pillar 3 is planned"; documentation/concepts/
 *     interactivity-boundary.html distinguishes the always-non-interactive
 *     implement-time invocation from the approve-time invocation that MAY
 *     dialogue; documentation/roadmap/status.html, documentation/reference/
 *     commands.html, and documentation/reference/agents.html all note the
 *     docs pair now also runs during /relay-implement (Pillar 2, primary),
 *     with the approve-time mentions recast as the safety-net leg;
 *     documentation/assets/data/search-index.json's pillars.html/agents.html
 *     excerpts mirror the same dual-dispatch relabel; documentation/changelog.html
 *     carries a content-complete 0.22.0 release entry that itself documents,
 *     in permanent dated prose, that plugin.json's version was bumped to 0.22.0.
 *
 * Extension note (test-reviewer CHANGES_REQUESTED on the original 8-test
 * session, single failing item R-AC-COVERAGE — all 5 pathology + GREEN +
 * lifecycle checks passed): the original session mapped every AC-7 target
 * to one blanket outcome row without individually verifying each touched
 * file carried a covering assertion. Two gaps slipped through, confirmed by
 * the reviewer via grep on the live files: (1) docs/KNOWLEDGE_BASE.md's
 * updated architecture.md index entry (line 24) had no test; (2) of the six
 * documentation/ site targets this phase touches, only pillars.html had
 * one — interactivity-boundary.html, roadmap/status.html,
 * reference/commands.html, reference/agents.html, and
 * assets/data/search-index.json had none. This extension adds six tests
 * closing both gaps. Because it extends a file authored THIS SAME SESSION
 * (still *Status: DRAFT* below, never approved), it is a continuation of
 * the original create, not a lifecycle UPDATE of an existing/approved
 * test — the lifecycle ledger tracks changes to APPROVED/pre-existing
 * tests, and none of the original 8 tests were touched (verbatim, still
 * passing).
 *
 * Lifecycle update (2026-07-29, EXISTING_TEST_UPDATED): the AC-A7 test below
 * originally also asserted `pluginJson.version === '0.22.0'` against the
 * LIVE `plugins/relay/.claude-plugin/plugin.json` file. That assertion was
 * transient, not a timeless content invariant: plugin.json's version is
 * whatever the MOST RECENT release cut set it to, so the literal "0.22.0"
 * equality was true only between the 0.22.0 cut (2026-07-16) and the next
 * one, and went red the moment v0.23.0 was cut (2026-07-29 —
 * documentation/changelog.html gained a new `<h2 id="v0-23-0">` heading and
 * plugin.json was bumped to 0.23.0). This is a sibling defect to the nine
 * changelog position-assertion fixes landed in commit d83b1b8
 * ("test(changelog): tolerate a release cut in position assertions"): same
 * root cause (a release cut), different manifestation (a literal live-value
 * equality here, rather than a heading-position pin there) — d83b1b8 did not
 * touch this file. The fact the live-plugin.json assertion was trying to
 * prove — that THIS feature genuinely bumped the version to 0.22.0 — is
 * already fully and permanently proven by the assertion two lines above it
 * in the same test, which reads the DATED HISTORICAL changelog prose
 * ("Plugin manifest bumped <code>0.21.0</code> &rarr; <code>0.22.0</code>"),
 * not the live file; that prose never changes once written, unlike
 * plugin.json's current value. The live-version assertion was therefore
 * both fragile AND redundant, so it was removed rather than replaced with a
 * weaker live check (e.g. a semver-shape regex or a bare JSON.parse
 * validity check): the only property such a check could add — that
 * plugin.json parses as valid, well-formed JSON — is already independently
 * and permanently guaranteed by `version-parity.mjs`'s
 * `runVersionParityCheck()` wrapper (exercised against the real file by
 * every `npm run validate` run), so adding it here would be pure
 * R-DUPLICATE assertion volume with zero marginal coverage. The
 * `PLUGIN_JSON_PATH` constant and its one remaining read/assert were
 * removed together with the assertion; the test's name no longer promises a
 * plugin.json literal-version check. Discriminativeness verified
 * empirically, the same way the prior nine fixes were verified: (1) the
 * updated test passes GREEN against this session's live tree, which already
 * carries the v0.23.0 release cut (plugin.json at "0.23.0", changelog
 * Unreleased renamed to a fresh 0.23.0 heading) — proving it is no longer
 * fooled by a release cut; (2) a simulated corruption of the 0.22.0 entry's
 * bump-prose substring (mutating "0.21.0" to "0.20.0" in the historical
 * sentence) was confirmed to still fail the test, proving it still catches
 * a genuinely corrupted 0.22.0 historical record, not just a live
 * version-number drift. Full justification recorded in the lifecycle ledger
 * of PRPs/reports/changelog-position-assertions/test-suite.diff.
 *
 * Run: node --test scripts/validate/checks/docs-sync-phase4.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ARCHITECTURE_PATH = 'docs/context/architecture.md';
const API_REFERENCE_PATH = 'docs/api-reference.md';
const FLOWS_PATH = 'docs/domain/flows.md';
const INTEGRATIONS_PATH = 'docs/context/integrations.md';
const DECISIONS_PATH = 'docs/decisions.md';
const KNOWLEDGE_BASE_PATH = 'docs/KNOWLEDGE_BASE.md';
const PILLARS_HTML_PATH = 'documentation/concepts/pillars.html';
const INTERACTIVITY_BOUNDARY_HTML_PATH = 'documentation/concepts/interactivity-boundary.html';
const STATUS_HTML_PATH = 'documentation/roadmap/status.html';
const COMMANDS_HTML_PATH = 'documentation/reference/commands.html';
const AGENTS_HTML_PATH = 'documentation/reference/agents.html';
const SEARCH_INDEX_JSON_PATH = 'documentation/assets/data/search-index.json';
const CHANGELOG_PATH = 'documentation/changelog.html';

/**
 * Reads a repo-root-relative file and normalizes line endings to `\n`.
 * @param {string} relPath
 * @returns {string}
 */
function readRepoFile(relPath) {
  return readFileSync(resolve(relPath), 'utf-8').replace(/\r\n/g, '\n');
}

/**
 * Collapses all whitespace runs (including newlines, so hard-wrapped prose
 * reads as one line) to a single space. Lets assertions target a verbatim
 * multi-line source phrase without being fragile to where the markdown
 * happens to wrap.
 * @param {string} str
 * @returns {string}
 */
function normalizeWhitespace(str) {
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Extracts the lines from the first line matching `startLineRe` up to (but
 * excluding) the next line matching `endLineRe`. Returns undefined if
 * `startLineRe` is never found. Same idiom as
 * docs-sync-phase2.test.mjs / docs-sync-phase3.test.mjs.
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
 * Finds the first line (trimmed) that STARTS WITH the given marker —
 * anchored, not a substring match anywhere in the file, so a marker that
 * also appears inside another row's prose is never mismatched. Used here to
 * locate a specific `docs/api-reference.md` agent-table row by its first two
 * cells (e.g. "| `docs-updater` ✅ |"). Returns undefined if absent.
 * @param {string} content
 * @param {string} marker
 * @returns {string | undefined}
 */
function findRowStartingWith(content, marker) {
  return content.split('\n').find((line) => line.trim().startsWith(marker));
}

// ---------------------------------------------------------------------------
// AC-A1 (PRD AC-7) — docs/context/architecture.md's "Three-pillar target
// architecture" section documents implement-time docs-sync as Pillar 2's
// PRIMARY pass (gated by docs_sync/--no-docs), and recasts Pillar 3's cycle
// as a safety-net reconciliation pass.
// ---------------------------------------------------------------------------

test("AC-A1 (PRD AC-7): architecture.md's Three-pillar section documents the docs-updater/docs-reviewer pair running as Pillar 2's PRIMARY, non-interactive pass immediately after Code Reviewer APPROVED, gated by docs_sync and --no-docs", () => {
  const content = readRepoFile(ARCHITECTURE_PATH);
  const section = extractSection(
    content,
    /^## Three-pillar target architecture/,
    /^## Interactivity boundary/
  );
  assert.ok(section, 'expected an extractable "## Three-pillar target architecture" section');
  const normalized = normalizeWhitespace(section);

  assert.ok(
    normalized.includes(
      'the `docs-updater`/`docs-reviewer` pair runs as the primary pass'
    ),
    'expected bullet 2 (Implementation) to describe the docs pair as the PRIMARY pass'
  );
  assert.ok(
    normalized.includes('(implement-time docs-sync)'),
    'expected bullet 2 to label the dispatch "implement-time docs-sync"'
  );
  assert.ok(
    normalized.includes(
      'gated by `docs_sync` in `docs/context/methodology.md` and a per-invocation `--no-docs` flag'
    ),
    'expected bullet 2 to document the docs_sync + --no-docs gating'
  );
});

test("AC-A1 (PRD AC-7): architecture.md's Pillar 3 bullet recasts the approve-time docs cycle as a low-delta safety-net reconciliation pass, no longer the primary sync path", () => {
  const content = readRepoFile(ARCHITECTURE_PATH);
  const section = extractSection(
    content,
    /^## Three-pillar target architecture/,
    /^## Interactivity boundary/
  );
  assert.ok(section, 'expected an extractable "## Three-pillar target architecture" section');
  const normalized = normalizeWhitespace(section);

  assert.ok(
    normalized.includes(
      'runs Docs Updater and Docs Reviewer as a low-delta safety-net reconciliation pass'
    ),
    'expected bullet 3 (Approval) to recast the docs cycle as a safety-net pass'
  );
  assert.ok(
    normalized.includes('primary docs-sync now happens at implement time (Pillar 2)'),
    'expected bullet 3 to state primary docs-sync moved to Pillar 2'
  );
});

// ---------------------------------------------------------------------------
// AC-A2 (PRD AC-7) — docs/api-reference.md's docs-updater/docs-reviewer rows
// document the dual dispatch with per-invocation diff sources.
// ---------------------------------------------------------------------------

test("AC-A2 (PRD AC-7): api-reference.md's docs-updater row documents dual dispatch with per-invocation diff sources — implement-time consumes the working-tree/attempt diff.patch, approve-time consumes gh pr diff <pr>", () => {
  const content = readRepoFile(API_REFERENCE_PATH);
  const row = findRowStartingWith(content, '| `docs-updater` ✅ |');
  assert.ok(row, 'expected a "| `docs-updater` ✅ |" agent-table row');
  const normalized = normalizeWhitespace(row);

  assert.ok(
    normalized.includes(
      'WRITER — dispatched twice: Pillar 2 (implement-time, primary) and Pillar 3 (approve-time, safety net)'
    ),
    'expected the Responsibility cell to open with the dual-dispatch framing'
  );
  assert.ok(
    normalized.includes(
      'Diff source is per-invocation: implement-time consumes the working-tree/attempt `diff.patch`'
    ),
    'expected the row to document the implement-time diff source'
  );
  assert.ok(
    normalized.includes('approve-time consumes `gh pr diff <pr>` from the merged PR'),
    'expected the row to document the approve-time diff source'
  );
});

test("AC-A2 (PRD AC-7): api-reference.md's docs-reviewer row documents the symmetric dual dispatch (Pillar 2 implement-time primary + Pillar 3 approve-time safety net)", () => {
  const content = readRepoFile(API_REFERENCE_PATH);
  const row = findRowStartingWith(content, '| `docs-reviewer` ✅ |');
  assert.ok(row, 'expected a "| `docs-reviewer` ✅ |" agent-table row');
  const normalized = normalizeWhitespace(row);

  assert.ok(
    normalized.includes(
      'REVIEWER — dispatched twice: Pillar 2 (implement-time, primary) and Pillar 3 (approve-time, safety net)'
    ),
    'expected the Responsibility cell to open with the symmetric dual-dispatch framing'
  );
});

// ---------------------------------------------------------------------------
// AC-A2 (PRD AC-7) — operator-authorized recovery pass (manual recovery of a
// FAILED_TDD_REVIEW_BUDGET_EXCEEDED halt): closes the 3 remaining
// R-AC-COVERAGE sub-target gaps within api-reference.md's AC-A2 scope that
// the two docs-updater/docs-reviewer row tests above do not reach — the
// Happy path prose, the /relay-implement row's Phase A.3.5 sentence, and the
// /relay-approve row's docs_sync: false self-skip clause.
// ---------------------------------------------------------------------------

test("AC-A2 (PRD AC-7): api-reference.md's Happy path prose, /relay-implement row, and /relay-approve row all document the implement-time-primary / approve-time-safety-net docs-sync model", () => {
  const content = readRepoFile(API_REFERENCE_PATH);

  const happyPathSection = extractSection(
    content,
    /^### Happy path/,
    /^### Full command surface/
  );
  assert.ok(happyPathSection, 'expected an extractable "### Happy path" section');
  const happyPathNormalized = normalizeWhitespace(happyPathSection);
  assert.ok(
    happyPathNormalized.includes(
      'Docs-sync already ran once during `/relay-execute` (inside `/relay-implement`, immediately after code-review `APPROVED`); once the PR merges, `/relay-approve <pr>` (Pillar 3) runs a low-delta safety-net docs-update cycle.'
    ),
    'expected the Happy path prose to document docs-sync already ran once during /relay-execute, with approve-time recast as a safety-net cycle'
  );

  const implementRow = findRowStartingWith(
    content,
    '| `/relay-implement <plan-path>` ✅ **implemented**'
  );
  assert.ok(implementRow, 'expected a "| `/relay-implement <plan-path>` ✅ **implemented**" row');
  assert.ok(
    implementRow.includes(
      'a `Phase A.3.5 — Docs-sync dispatch` sub-phase runs the `docs-updater`/`docs-reviewer` pair non-interactively'
    ),
    'expected the /relay-implement row to document the Phase A.3.5 — Docs-sync dispatch sub-phase'
  );
  assert.ok(
    implementRow.includes('syncing `docs/` in the worktree'),
    'expected the /relay-implement row to document that the dispatch syncs docs/ in the worktree'
  );

  const approveRow = findRowStartingWith(content, '| `/relay-approve <pr>` ✅ **implemented**');
  assert.ok(approveRow, 'expected a "| `/relay-approve <pr>` ✅ **implemented**" row');
  assert.ok(
    approveRow.includes(
      'The docs cycle self-skips when `docs_sync: false` in `docs/context/methodology.md` (the same master switch shared with the implement-time dispatch)'
    ),
    'expected the /relay-approve row to document the docs_sync: false self-skip clause'
  );
});

// ---------------------------------------------------------------------------
// AC-A3 (PRD AC-7) — docs/domain/flows.md and docs/context/integrations.md
// no longer name the nonexistent /approve-implementation command; the live
// reference surface is clean.
// ---------------------------------------------------------------------------

test('AC-A3 (PRD AC-7): flows.md and integrations.md no longer reference the nonexistent /approve-implementation command — both name the real /relay-approve <pr> command instead', () => {
  const flowsContent = readRepoFile(FLOWS_PATH);
  const integrationsContent = readRepoFile(INTEGRATIONS_PATH);

  assert.ok(
    !flowsContent.includes('approve-implementation'),
    'docs/domain/flows.md must not reference the nonexistent /approve-implementation command'
  );
  assert.ok(
    !integrationsContent.includes('approve-implementation'),
    'docs/context/integrations.md must not reference the nonexistent /approve-implementation command'
  );
  assert.ok(
    flowsContent.includes('User runs `/relay-approve <pr>`.'),
    'expected flows.md\'s Approval flow step 1 to name the real /relay-approve <pr> command'
  );

  const ghSection = extractSection(
    integrationsContent,
    /^## GitHub CLI/,
    /^## Git worktrees/
  );
  assert.ok(ghSection, 'expected an extractable "## GitHub CLI" section in integrations.md');
  assert.ok(
    !ghSection.includes('planned'),
    'the gh CLI entry must no longer carry a stale "(planned — Phase 3/4)" tag'
  );
  assert.ok(
    ghSection.includes('`/relay-approve <pr>` command'),
    'expected the gh CLI entry\'s "Used by" line to name /relay-approve <pr>'
  );
});

// ---------------------------------------------------------------------------
// AC-A3 (PRD AC-7) — operator-authorized recovery pass (manual recovery of a
// FAILED_TDD_REVIEW_BUDGET_EXCEEDED halt): closes the remaining
// R-AC-COVERAGE gap in flows.md's Implementation flow step 7.5 (the
// docs-sync-immediately-after-Code-Reviewer-APPROVED clause), which the
// /approve-implementation-removal test above does not cover — that test only
// exercises the Approval flow's step 1 and the global absence check.
// ---------------------------------------------------------------------------

test('AC-A3 (PRD AC-7): flows.md\'s Implementation flow step 7.5 documents the docs pair running non-interactively immediately after Code Reviewer APPROVED, with any deferred operator question going to the final report instead of interrupting the run', () => {
  const content = readRepoFile(FLOWS_PATH);
  const section = extractSection(content, /^## 2\. Implementation flow/, /^## 3\. Approval flow/);
  assert.ok(section, 'expected an extractable "## 2. Implementation flow" section');
  const normalized = normalizeWhitespace(section);

  assert.ok(
    normalized.includes(
      'a docs pair (`docs-updater`/`docs-reviewer`) runs non-interactively to sync `docs/` with the change directly in the worktree'
    ),
    'expected step 7.5 to document the non-interactive docs pair sync directly in the worktree'
  );
  assert.ok(
    normalized.includes(
      'any question it would have asked a human is deferred to the final report instead of interrupting the run'
    ),
    'expected step 7.5 to document that deferred operator questions go to the final report instead of interrupting the run'
  );
});

// ---------------------------------------------------------------------------
// AC-A4 (PRD AC-7) — docs/decisions.md carries the new [2026-07-16] entry
// recording both conscious refinements, appended without disturbing any
// prior entry.
// ---------------------------------------------------------------------------

test('AC-A4 (PRD AC-7): decisions.md carries a new [2026-07-16] entry recording both conscious refinements (interactivity-extension scope + Pillar 2 relocation), appended without disturbing the immediately preceding entry', () => {
  const content = readRepoFile(DECISIONS_PATH);

  assert.ok(
    content.includes(
      '## [2026-07-16] Docs-sync relocates to Pillar 2 (implementation); Pillar 3 retained as a safety net; implement-time invocation stays non-interactive'
    ),
    'expected the new 2026-07-16 decision heading'
  );

  const normalized = normalizeWhitespace(content);
  assert.ok(
    normalized.includes(
      "The [2026-06-19] post-merge interactivity extension (allowing the docs pair to dialogue with the operator) applies ONLY to the approve-time invocation."
    ),
    'expected conscious refinement #1 (interactivity extension scope) to be recorded'
  );
  assert.ok(
    normalized.includes(
      "Primary docs-sync relocates to Pillar 2: `/relay-implement`'s `Phase A.3.5` dispatch"
    ) &&
      normalized.includes(
        'is RETAINED, unchanged in mechanics, now serving as a low-delta safety-net reconciliation pass'
      ),
    'expected conscious refinement #2 (Pillar 2 relocation, Pillar 3 retained) to be recorded'
  );

  const priorEntryOccurrences = (
    content.match(/^## \[2026-07-10\] Test pair universalized/gm) || []
  ).length;
  assert.equal(
    priorEntryOccurrences,
    1,
    `expected the immediately-preceding [2026-07-10] entry to occur exactly once (APPEND-only invariant), found ${priorEntryOccurrences}`
  );
});

// ---------------------------------------------------------------------------
// AC-A5 (PRD AC-7) — docs/KNOWLEDGE_BASE.md's docs/context/architecture.md
// index descriptor flags the Pillar 2/3 docs-sync split now that the
// underlying file's content changed materially.
// ---------------------------------------------------------------------------

test("AC-A5 (PRD AC-7): KNOWLEDGE_BASE.md's docs/context/architecture.md index entry flags the Pillar 2/3 docs-sync split (implement-time primary, approve-time safety net)", () => {
  const content = readRepoFile(KNOWLEDGE_BASE_PATH);
  const row = findRowStartingWith(content, '→ docs/context/architecture.md');
  assert.ok(row, 'expected a "→ docs/context/architecture.md" index-entry row');

  assert.ok(
    row.includes(
      'Pillar 2/3 docs-sync split (implement-time primary, approve-time safety net)'
    ),
    'expected the architecture.md index descriptor to flag the Pillar 2/3 docs-sync split'
  );
});

// ---------------------------------------------------------------------------
// AC-A6 (PRD AC-7) — documentation/concepts/pillars.html no longer asserts
// "Pillar 3 is planned"; the Status callout is accurate.
// ---------------------------------------------------------------------------

test('AC-A6 (PRD AC-7): pillars.html no longer asserts "Pillar 3 is planned" — the Status callout states all three pillars shipped and recasts Pillar 3\'s docs cycle as a low-delta safety net', () => {
  const content = readRepoFile(PILLARS_HTML_PATH);

  assert.ok(
    !content.includes('Pillar 3 is planned'),
    'the stale "Pillar 3 is planned" callout text must be gone'
  );

  const normalized = normalizeWhitespace(content);
  assert.ok(
    normalized.includes('All three pillars have shipped.'),
    'expected the Status callout to state all three pillars have shipped'
  );
  assert.ok(
    normalized.includes(
      "so Pillar 3's docs cycle is now a low-delta safety-net reconciliation pass that catches only decisions made after implementation."
    ),
    'expected the Status callout to recast Pillar 3\'s docs cycle as a safety net'
  );
});

// ---------------------------------------------------------------------------
// AC-A6 (PRD AC-7) — documentation/concepts/pillars.html's Pillar 2 agent
// list (the second of AC-A6's two named pillars.html sub-targets, alongside
// the Status callout test above) gains the "Docs pair (docs-updater &
// docs-reviewer)" <li>, dispatched non-interactively immediately after Code
// Reviewer approves and not depending on reaching approve.
// ---------------------------------------------------------------------------

test('AC-A6 (PRD AC-7): pillars.html\'s Pillar 2 "The agents" list includes the Docs pair (docs-updater & docs-reviewer) <li>, dispatched non-interactively immediately after Code Reviewer approves, syncing docs/ so the knowledge base does not depend on reaching approve', () => {
  const content = readRepoFile(PILLARS_HTML_PATH);
  const section = extractSection(
    content,
    /^\s*<h3 id="the-agents">/,
    /^\s*<h3 id="budgets">/
  );
  assert.ok(section, 'expected an extractable "The agents" Pillar 2 list section');
  const normalized = normalizeWhitespace(section);

  assert.ok(
    normalized.includes('<strong>Docs pair (docs-updater &amp; docs-reviewer)</strong>'),
    'expected the Pillar 2 agent list to include the Docs pair <li> label'
  );
  assert.ok(
    normalized.includes(
      'does not depend on reaching approve'
    ),
    'expected the Docs pair <li> to state the sync does not depend on reaching approve'
  );
});

// ---------------------------------------------------------------------------
// AC-A6 (PRD AC-7) — documentation/concepts/interactivity-boundary.html
// distinguishes the two docs-pair call sites: approve-time MAY dialogue
// (2026-06-19 extension), implement-time is always non-interactive.
// ---------------------------------------------------------------------------

test('AC-A6 (PRD AC-7): interactivity-boundary.html distinguishes the two docs-pair invocations — approve-time MAY dialogue (2026-06-19 extension), implement-time (inside /relay-implement, Pillar 2) is always non-interactive', () => {
  const content = readRepoFile(INTERACTIVITY_BOUNDARY_HTML_PATH);
  const section = extractSection(
    content,
    /^\s*<h3 id="pillar-3-is-also-on-the-manual-side">/,
    /^\s*<h2 id="consequences-for-tooling">/
  );
  assert.ok(section, 'expected an extractable Pillar 3 trigger-boundary section');
  const normalized = normalizeWhitespace(section);

  assert.ok(
    normalized.includes(
      'The Docs Updater/Docs Reviewer pair no longer lives only inside Pillar 3: it also runs a second, earlier invocation inside <code>/relay-implement</code> (Pillar 2), immediately after Code Reviewer approves.'
    ),
    'expected the section to state the docs pair now also runs inside /relay-implement (Pillar 2)'
  );
  assert.ok(
    normalized.includes(
      'the approve-time invocation MAY dialogue with the operator on ambiguous rules (the 2026-06-19 extension), while the implement-time invocation is always non-interactive'
    ),
    'expected the section to distinguish the approve-time (may dialogue) invocation from the implement-time (always non-interactive) invocation'
  );
});

// ---------------------------------------------------------------------------
// AC-A6 (PRD AC-7) — documentation/roadmap/status.html notes the docs pair
// now also runs during /relay-implement (Pillar 2, primary sync), with the
// Phase-4/Approval-roadmap mention recast as the safety-net leg.
// ---------------------------------------------------------------------------

test("AC-A6 (PRD AC-7): status.html's Docs Updater/Reviewer entries note the pair now also runs during /relay-implement (Pillar 2, primary sync), with the Phase-4/Approval-roadmap mention recast as the safety-net leg", () => {
  const content = readRepoFile(STATUS_HTML_PATH);
  const normalized = normalizeWhitespace(content);

  assert.ok(
    normalized.includes(
      'Since <code>implement-phase-docs-sync</code> (2026-07-16), the same pair also runs during <code>/relay-implement</code> (Pillar 2, immediately after code-review approval) as the primary sync point, with this Phase-4/Approval-roadmap invocation recast as a low-delta safety-net pass.'
    ),
    'expected the "What\'s shipped" plugin-artifacts paragraph to note the implement-time dispatch'
  );
  assert.ok(
    normalized.includes(
      "then runs Docs Updater and Docs Reviewer agents as a safety-net pass to keep <code>docs/context/</code> and <code>docs/domain/</code> in sync with what was merged &mdash; the pair's primary sync now happens earlier, during <code>/relay-implement</code> (Pillar 2)."
    ),
    'expected the Phase 4 (Approval cycle) /relay-approve list item to recast the pass as a safety net'
  );
});

// ---------------------------------------------------------------------------
// AC-A6 (PRD AC-7) — documentation/reference/commands.html's /relay-implement
// and /relay-approve sections gain the same dual-dispatch mentions as their
// docs/api-reference.md counterparts.
// ---------------------------------------------------------------------------

test("AC-A6 (PRD AC-7): commands.html's /relay-implement Output documents the Phase A.3.5 docs-sync dispatch, and /relay-approve Output documents the docs_sync self-skip gate + implement-time idempotency", () => {
  const content = readRepoFile(COMMANDS_HTML_PATH);
  const normalized = normalizeWhitespace(content);

  assert.ok(
    normalized.includes(
      "Immediately after code-review <code>APPROVED</code> and before the D8 mutations, a <code>Phase A.3.5 &mdash; Docs-sync dispatch</code> sub-phase runs the <code>docs-updater</code>/<code>docs-reviewer</code> pair non-interactively against the current attempt's <code>diff.patch</code>, syncing <code>docs/</code> in the worktree"
    ),
    'expected the /relay-implement Output <dd> to document the Phase A.3.5 docs-sync dispatch'
  );
  assert.ok(
    normalized.includes(
      'The docs cycle self-skips when <code>docs_sync: false</code> in <code>docs/context/methodology.md</code> (the same master switch shared with the implement-time dispatch); when it runs, it is idempotent against a worktree already synced at implement time.'
    ),
    'expected the /relay-approve Output <dd> to document the docs_sync self-skip gate and implement-time idempotency'
  );
});

// ---------------------------------------------------------------------------
// AC-A6 (PRD AC-7) — documentation/reference/agents.html's docs-updater and
// docs-reviewer blocks gain the dual-dispatch relabel (symmetric with the
// docs/api-reference.md row edit).
// ---------------------------------------------------------------------------

test("AC-A6 (PRD AC-7): agents.html's docs-updater and docs-reviewer blocks document the dual-dispatch relabel — Invoked by names both call sites, Responsibility opens with the Pillar 2/Pillar 3 dispatched-twice framing", () => {
  const content = readRepoFile(AGENTS_HTML_PATH);

  const updaterSection = extractSection(
    content,
    /^\s*<h3 id="docs-updater">/,
    /^\s*<h3 id="docs-reviewer">/
  );
  assert.ok(updaterSection, 'expected an extractable docs-updater section');
  const updaterNormalized = normalizeWhitespace(updaterSection);

  assert.ok(
    updaterNormalized.includes(
      '<dt>Invoked by</dt><dd><code>/relay-implement</code> command (Phase A.3.5, immediately after code-review <code>APPROVED</code>, non-interactive) AND <code>/relay-approve</code> command (post-merge, before <code>docs-reviewer</code>, safety-net pass)</dd>'
    ),
    "expected docs-updater's Invoked by cell to name both the /relay-implement and /relay-approve call sites"
  );
  assert.ok(
    updaterNormalized.includes(
      'WRITER, dispatched twice &mdash; Pillar 2 (implement-time, primary sync) and Pillar 3 (approve-time, safety net).'
    ),
    "expected docs-updater's Responsibility cell to open with the dual-dispatch framing"
  );

  const reviewerSection = extractSection(
    content,
    /^\s*<h3 id="docs-reviewer">/,
    /^\s*<h2 id="planned">/
  );
  assert.ok(reviewerSection, 'expected an extractable docs-reviewer section');
  const reviewerNormalized = normalizeWhitespace(reviewerSection);

  assert.ok(
    reviewerNormalized.includes(
      '<dt>Invoked by</dt><dd><code>/relay-implement</code> command (Phase A.3.5, immediately after code-review <code>APPROVED</code>, non-interactive) AND <code>/relay-approve</code> command (post-merge, immediately after <code>docs-updater</code>, safety-net pass)</dd>'
    ),
    "expected docs-reviewer's Invoked by cell to name both call sites, symmetric with docs-updater"
  );
  assert.ok(
    reviewerNormalized.includes(
      'REVIEWER, dispatched twice &mdash; Pillar 2 (implement-time, primary sync) and Pillar 3 (approve-time, safety net).'
    ),
    "expected docs-reviewer's Responsibility cell to open with the symmetric dual-dispatch framing"
  );
});

// ---------------------------------------------------------------------------
// AC-A6 (PRD AC-7) — documentation/assets/data/search-index.json's
// pillars.html and agents.html excerpts mirror the same relabel this phase
// applies to the pages themselves (documentation/AGENTS.md §9).
// ---------------------------------------------------------------------------

test('AC-A6 (PRD AC-7): search-index.json parses as valid JSON, and its pillars.html + agents.html excerpts reflect the dual-dispatch docs-sync relabel (no longer Pillar-3-only)', () => {
  const entries = JSON.parse(readRepoFile(SEARCH_INDEX_JSON_PATH));
  assert.ok(Array.isArray(entries), 'expected search-index.json to parse as a JSON array');

  const pillarsEntry = entries.find((e) => e.path === 'concepts/pillars.html');
  assert.ok(pillarsEntry, 'expected a concepts/pillars.html entry');
  assert.ok(
    pillarsEntry.excerpt.includes(
      'Implementation (PRD to PR, including implement-time docs-sync)'
    ),
    'expected the pillars.html excerpt to mention implement-time docs-sync under Implementation'
  );
  assert.ok(
    pillarsEntry.excerpt.includes('Approval (merge plus a low-delta docs-sync safety net)'),
    "expected the pillars.html excerpt to recast Approval's docs cycle as a low-delta safety net"
  );

  const agentsEntry = entries.find((e) => e.path === 'reference/agents.html');
  assert.ok(agentsEntry, 'expected a reference/agents.html entry');
  assert.ok(
    !agentsEntry.excerpt.includes('Pillar 3 writer, v0.17.0'),
    'the agents.html excerpt must no longer label docs-updater Pillar-3-only'
  );
  assert.ok(
    agentsEntry.excerpt.includes(
      'docs-updater (dispatched twice, implement-time primary and approve-time safety net, v0.17.0)'
    ),
    'expected the agents.html excerpt to relabel docs-updater with the dual-dispatch framing'
  );
  assert.ok(
    agentsEntry.excerpt.includes(
      'docs-reviewer (dispatched twice, implement-time primary and approve-time safety net, v0.17.0)'
    ),
    'expected the agents.html excerpt to relabel docs-reviewer with the dual-dispatch framing'
  );
});

// ---------------------------------------------------------------------------
// AC-A7 (PRD AC-7) — documentation/changelog.html carries a content-complete
// 0.22.0 release entry, including permanent dated prose documenting the
// plugin.json version bump this feature performed. Distinct from
// version-parity.mjs's cross-file version-NUMBER-matching check — see the
// file-header R-DUPLICATE note. Does NOT assert plugin.json's LIVE version
// field (release-cut-transient) — see the file-header 2026-07-29
// EXISTING_TEST_UPDATED lifecycle note.
// ---------------------------------------------------------------------------

test('AC-A7 (PRD AC-7): changelog.html carries a content-complete 0.22.0 release entry naming this feature\'s specific fixes, including permanent dated prose documenting the plugin.json version bump (content invariant, not the cross-file version-parity check, and not a check on plugin.json\'s current live version)', () => {
  const changelogContent = readRepoFile(CHANGELOG_PATH);

  assert.ok(
    changelogContent.includes('<h2 id="v0-22-0">0.22.0 &#8212; 2026-07-16</h2>'),
    'expected the 0.22.0 release heading'
  );
  assert.ok(
    changelogContent.includes('Phase A.3.5 &mdash; Docs-sync dispatch'),
    'expected the release summary to name the Phase A.3.5 docs-sync dispatch'
  );
  assert.ok(
    changelogContent.includes('a "Pillar 3 is planned" status callout'),
    'expected the release summary to name the fixed "Pillar 3 is planned" callout'
  );
  assert.ok(
    changelogContent.includes('nonexistent <code>/approve-implementation</code> command name'),
    'expected the release summary to name the fixed /approve-implementation drift'
  );
  assert.ok(
    changelogContent.includes(
      'Plugin manifest bumped <code>0.21.0</code> &rarr; <code>0.22.0</code>'
    ),
    // This is the permanent, dated historical record of the version bump —
    // it never changes once written. plugin.json's LIVE version is
    // intentionally NOT read/asserted in this test: it is transient (every
    // subsequent release cut changes it — see the 2026-07-29
    // EXISTING_TEST_UPDATED lifecycle note in the file header) and is
    // already independently covered by version-parity.mjs's real-file
    // JSON-validity guarantee (npm run validate, every run). Asserting a
    // live equality here would be release-cut-fragile AND redundant with
    // this assertion, which already permanently proves the bump happened.
    'expected the Changed list to document the plugin.json version bump in dated historical prose'
  );
});
